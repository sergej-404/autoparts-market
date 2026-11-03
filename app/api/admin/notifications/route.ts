import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

async function principal() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, role: true } });
  return user && (user.role === "ADMIN" || user.role === "MODERATOR") ? user : null;
}

export async function GET() {
  const actor = await principal();
  if (!actor) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  const [notifications, users] = await Promise.all([
    prisma.notification.findMany({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, ...(actor.role === "ADMIN" ? {} : { fromUserId: actor.id }) }, include: { fromUser: { select: { name: true } }, toUser: { select: { id: true, publicId: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.user.findMany({ select: { id: true, publicId: true, name: true, email: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  return NextResponse.json({ notifications, users, role: actor.role });
}

export async function POST(request: Request) {
  const actor = await principal();
  if (!actor) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const type = data.type;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (type !== "SYSTEM" && type !== "PERSONAL" && type !== "GENERAL") return NextResponse.json({ error: "Выберите тип уведомления." }, { status: 400 });
  if (actor.role === "MODERATOR" && type === "GENERAL") return NextResponse.json({ error: "Модератор не может отправлять общие уведомления." }, { status: 403 });
  if (!text || text.length > 10000 || title.length > 160) return NextResponse.json({ error: "Текст обязателен (до 10000 символов), заголовок — до 160 символов." }, { status: 400 });
  if (type !== "GENERAL" && typeof data.toUserId !== "string") return NextResponse.json({ error: "Выберите пользователя." }, { status: 400 });
  const recipients = type === "GENERAL"
    ? await prisma.user.findMany({ select: { id: true } })
    : await prisma.user.findMany({ where: { id: data.toUserId as string }, select: { id: true } });
  if (!recipients.length) return NextResponse.json({ error: "Получатель не найден." }, { status: 404 });
  const disabledPreferences = await prisma.notificationPreference.findMany({
    where: { userId: { in: recipients.map((recipient) => recipient.id) }, site: false },
    select: { userId: true },
  });
  const disabledIds = new Set(disabledPreferences.map((preference) => preference.userId));
  const enabledRecipients = recipients.filter((recipient) => !disabledIds.has(recipient.id));
  if (!enabledRecipients.length) return NextResponse.json({ count: 0, skipped: recipients.length }, { status: 201 });
  const batchId = crypto.randomUUID();
  const created = await prisma.notification.createMany({
    data: enabledRecipients.map((recipient) => ({ type, batchId, fromUserId: actor.id, toUserId: recipient.id, title: title || null, text })),
  });
  if (created.count > 0) {
    await sendPushToUsers(enabledRecipients.map((recipient) => recipient.id), "site", {
      title: title || "Уведомление AXION X",
      body: text,
      url: "/notifications",
    });
  }
  return NextResponse.json({ count: created.count, skipped: recipients.length - created.count }, { status: 201 });
}


export async function DELETE(request: Request) {
  const actor = await principal();
  if (!actor) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  const data: unknown = await request.json().catch(() => null);
  if (!data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") return NextResponse.json({ error: "Укажите уведомление." }, { status: 400 });
  const target = await prisma.notification.findUnique({ where: { id: data.id }, select: { id: true, type: true, fromUserId: true, batchId: true } });
  if (!target || (actor.role !== "ADMIN" && target.fromUserId !== actor.id)) return NextResponse.json({ error: "Уведомление не найдено." }, { status: 404 });
  if (target.type === "GENERAL" && target.batchId) {
    const result = await prisma.notification.deleteMany({ where: { batchId: target.batchId, type: "GENERAL", fromUserId: target.fromUserId } });
    return NextResponse.json({ count: result.count });
  }
  // Legacy broadcasts have no batch identifier: delete only the selected row to
  // avoid accidentally deleting a separate broadcast with the same text.
  const result = await prisma.notification.deleteMany({ where: { id: target.id } });
  return NextResponse.json({ count: result.count });
}
