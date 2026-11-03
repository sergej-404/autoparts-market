import {
  createCipheriv,
  createECDH,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  randomBytes,
  sign,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

type PushChannel = "site" | "orders" | "messages";
type PushPayload = { title: string; body: string; url?: string };
type StoredSubscription = { endpoint: string; p256dh: string; auth: string };

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Не заданы VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT.");
  }
  const publicBytes = decodeBase64Url(publicKey);
  const privateBytes = decodeBase64Url(privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32
    || !(subject.startsWith("mailto:") || subject.startsWith("https://"))) {
    throw new Error("Некорректная пара VAPID P-256 ключей или VAPID_SUBJECT.");
  }
  const signingKey = createPrivateKey({
    key: {
      kty: "EC", crv: "P-256",
      x: encodeBase64Url(publicBytes.subarray(1, 33)),
      y: encodeBase64Url(publicBytes.subarray(33, 65)),
      d: encodeBase64Url(privateBytes),
    },
    format: "jwk",
  });
  const derivedPublic = createPublicKey(signingKey).export({ format: "jwk" });
  if (derivedPublic.x !== encodeBase64Url(publicBytes.subarray(1, 33))
    || derivedPublic.y !== encodeBase64Url(publicBytes.subarray(33, 65))) {
    throw new Error("VAPID_PUBLIC_KEY не соответствует VAPID_PRIVATE_KEY.");
  }
  return { publicKey, publicBytes, privateBytes, subject, signingKey };
}

export function getVapidPublicKey(): string | null {
  try {
    return getVapidConfig().publicKey;
  } catch {
    return null;
  }
}

function createVapidAuthorization(endpoint: string): string {
  const config = getVapidConfig();
  const url = new URL(endpoint);
  const header = encodeBase64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = encodeBase64Url(Buffer.from(JSON.stringify({
    aud: url.origin,
    exp: now + 12 * 60 * 60,
    sub: config.subject,
  })));
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: config.signingKey, dsaEncoding: "ieee-p1363" });
  return `vapid t=${unsigned}.${encodeBase64Url(signature)}, k=${config.publicKey}`;
}

function encryptPayload(subscription: StoredSubscription, payload: PushPayload): Buffer {
  const userPublicKey = decodeBase64Url(subscription.p256dh);
  const authSecret = decodeBase64Url(subscription.auth);
  if (userPublicKey.length !== 65 || userPublicKey[0] !== 4 || authSecret.length !== 16) {
    throw new Error("Некорректные ключи Push-подписки.");
  }

  const ecdh = createECDH("prime256v1");
  const serverPublicKey = ecdh.generateKeys();
  const sharedSecret = ecdh.computeSecret(userPublicKey);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    userPublicKey,
    serverPublicKey,
  ]);
  // Node's hkdfSync performs HKDF-Extract and HKDF-Expand as specified by RFC 5869.
  const inputKeyMaterial = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const contentKey = Buffer.from(hkdfSync(
    "sha256", inputKeyMaterial, salt, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16,
  ));
  const nonce = Buffer.from(hkdfSync(
    "sha256", inputKeyMaterial, salt, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12,
  ));
  const cipher = createCipheriv("aes-128-gcm", contentKey, nonce);
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload), "utf8"), Buffer.from([2])]);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, recordSize, Buffer.from([serverPublicKey.length]), serverPublicKey, ciphertext]);
}

async function sendOne(subscription: StoredSubscription, payload: PushPayload): Promise<"sent" | "expired"> {
  const safePayload: PushPayload = {
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 500),
    url: payload.url && payload.url.startsWith("/") ? payload.url : "/notifications",
  };
  const encryptedBody = encryptPayload(subscription, safePayload);
  const body = new Uint8Array(encryptedBody.length);
  body.set(encryptedBody);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: createVapidAuthorization(subscription.endpoint),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404 || response.status === 410) return "expired";
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Push service вернул HTTP ${response.status}: ${responseText.slice(0, 300)}`);
  }
  return "sent";
}

/** Sends a push to all registered devices, re-checking the user's category preference. */
export async function sendPushToUsers(
  userIds: string[],
  channel: PushChannel,
  payload: PushPayload,
): Promise<void> {
  if (!userIds.length) return;
  try {
    getVapidConfig();
    const uniqueIds = [...new Set(userIds)];
    const [subscriptions, preferences] = await Promise.all([
      prisma.pushSubscription.findMany({
        where: { userId: { in: uniqueIds } },
        select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
      }),
      prisma.notificationPreference.findMany({
        where: { userId: { in: uniqueIds } },
        select: { userId: true, site: true, orders: true, messages: true },
      }),
    ]);
    const preferenceByUser = new Map(preferences.map((preference) => [preference.userId, preference]));
    await Promise.all(subscriptions.map(async (subscription) => {
      const preference = preferenceByUser.get(subscription.userId);
      if (preference && !preference[channel]) return;
      try {
        const result = await sendOne(subscription, payload);
        if (result === "expired") {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        }
      } catch (error) {
        console.error("Web Push delivery failed", {
          subscriptionId: subscription.id,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }));
  } catch (error) {
    // Push delivery must never roll back a successfully created order or message.
    console.error("Web Push is not configured or could not be dispatched", error);
  }
}
