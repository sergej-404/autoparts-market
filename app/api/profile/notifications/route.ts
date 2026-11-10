import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const defaults = { site: true, orders: true, messages: true };

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { site: true, orders: true, messages: true },
  });
  return NextResponse.json(preferences ?? defaults);
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Некорректные настройки." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const data: { site?: boolean; orders?: boolean; messages?: boolean } = {};
  for (const key of ["site", "orders", "messages"] as const) {
    if (key in input) {
      if (typeof input[key] !== "boolean") {
        return NextResponse.json({ error: `Параметр ${key} должен быть логическим.` }, { status: 400 });
      }
      data[key] = input[key];
    }
  }
  if (Object.keys(data).length === 0 || Object.keys(input).some((key) => !["site", "orders", "messages"].includes(key))) {
    return NextResponse.json({ error: "Укажите хотя бы одну допустимую настройку." }, { status: 400 });
  }

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...defaults, ...data },
    update: data,
    select: { site: true, orders: true, messages: true },
  });
  return NextResponse.json(preferences);
}
