
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

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
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
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
