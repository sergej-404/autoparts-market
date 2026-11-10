import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isIP } from "node:net";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedPushHosts = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

function isTrustedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const hostname = url.hostname.toLowerCase();
    if (isIP(hostname) || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    return allowedPushHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

async function currentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const count = await prisma.pushSubscription.count({ where: { userId } });
  return NextResponse.json({ count });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Некорректная Push-подписка." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const endpoint = typeof data.endpoint === "string" ? data.endpoint : "";
  const keys = data.keys && typeof data.keys === "object" ? data.keys as Record<string, unknown> : null;
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh : "";
  const authSecret = typeof keys?.auth === "string" ? keys.auth : "";
  const expirationTime = typeof data.expirationTime === "number" && Number.isFinite(data.expirationTime)
    ? new Date(data.expirationTime)
    : null;

  if (endpoint.length > 2048 || !isTrustedPushEndpoint(endpoint)
    || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh)
    || !/^[A-Za-z0-9_-]{20,30}$/.test(authSecret)
    || (expirationTime && Number.isNaN(expirationTime.getTime()))) {
    return NextResponse.json({ error: "Подписка браузера имеет некорректный формат." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth: authSecret, expirationTime },
    update: { userId, p256dh, auth: authSecret, expirationTime },
  });

  const excess = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    skip: 20,
    select: { id: true },
  });
  if (excess.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: excess.map((item) => item.id) } } });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as Record<string, unknown>).endpoint !== "string") {
    return NextResponse.json({ error: "Укажите endpoint подписки." }, { status: 400 });
  }
  const endpoint = (body as { endpoint: string }).endpoint;
  if (endpoint.length > 2048 || !isTrustedPushEndpoint(endpoint)) {
    return NextResponse.json({ error: "Некорректный endpoint." }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  return NextResponse.json({ success: true });
}
