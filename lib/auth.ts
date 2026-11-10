
import { randomInt } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { normalizeRussianPhone } from "@/lib/phone";

const secret = process.env.BETTER_AUTH_SECRET;

if (process.env.NODE_ENV === "production" && !secret) {
  throw new Error("BETTER_AUTH_SECRET должен быть задан в production.");
}

const appUrl =
  process.env.BETTER_AUTH_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://autoparts-market-six.vercel.app"
    : "http://localhost:3000");

const additionalTrustedOrigins = (
  process.env.ADDITIONAL_TRUSTED_ORIGINS || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "AXION X",
  baseURL: appUrl,
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const rawPhone = typeof user.phone === "string" ? user.phone : "";
          const phone = normalizeRussianPhone(rawPhone);
          if (!phone) {
            throw new APIError("BAD_REQUEST", { message: "Введите телефон в формате +7 (XXX) XXX-XX-XX." });
          }
          const existingPhones = await prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } });
          if (existingPhones.some((entry) => entry.phone && normalizeRussianPhone(entry.phone) === phone)) {
            throw new APIError("BAD_REQUEST", { message: "Этот номер телефона уже используется другим аккаунтом." });
          }
          let publicId = "";
          for (let attempt = 0; attempt < 20; attempt++) {
            const candidate = `us-${Array.from({ length: 6 }, () => randomInt(10)).join("")}`;
            const exists = await prisma.user.findUnique({ where: { publicId: candidate }, select: { id: true } });
            if (!exists) { publicId = candidate; break; }
          }
          if (!publicId) throw new APIError("SERVICE_UNAVAILABLE", { message: "Не удалось создать публичный ID. Повторите попытку." });
          return { data: { ...user, phone, publicId } };
        },
      },
    },
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: true,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  trustedOrigins: [
    ...new Set([appUrl, ...additionalTrustedOrigins]),
  ],
});
