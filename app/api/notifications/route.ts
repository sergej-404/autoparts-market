import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { toUserId: session.user.id }, include: { fromUser: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.notification.count({ where: { toUserId: session.user.id, readAt: null } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).id !== "string") return NextResponse.json({ error: "Не указан ID уведомления." }, { status: 400 });
  const id = (body as { id: string }).id;
  const result = await prisma.notification.updateMany({ where: { id, toUserId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  if (!result.count) {
    const exists = await prisma.notification.findFirst({ where: { id, toUserId: session.user.id } });
    if (!exists) return NextResponse.json({ error: "Уведомление не найдено." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
