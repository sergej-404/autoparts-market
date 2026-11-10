import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotificationIfEnabled } from "@/lib/notification-preferences";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

async function context(orderId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: NextResponse.json({ error: "Необходима авторизация." }, { status: 401 }) } as const;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, role: true } });
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true, orderCode: true } });
  if (!user || !order || (user.id !== order.userId && user.role !== "ADMIN" && user.role !== "MODERATOR")) return { error: NextResponse.json({ error: "Заказ не найден или доступ запрещён." }, { status: 403 }) } as const;
  return { user, order } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const ctx = await context(orderId);
  if ("error" in ctx) return ctx.error;
  await prisma.orderMessage.updateMany({ where: { orderId, recipientId: ctx.user.id, readAt: null }, data: { readAt: new Date() } });
  const messages = await prisma.orderMessage.findMany({ where: { orderId }, orderBy: { createdAt: "asc" }, select: { id: true, senderName: true, senderRole: true, senderId: true, text: true, photos: true, createdAt: true } });
  return NextResponse.json({ messages, currentUserId: ctx.user.id });
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const ctx = await context(orderId);
  if ("error" in ctx) return ctx.error;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).text !== "string") return NextResponse.json({ error: "Введите сообщение." }, { status: 400 });
  const text = ((body as Record<string, string>).text).trim();
  const rawPhotos = (body as Record<string, unknown>).photos;
  const photos = Array.isArray(rawPhotos) ? rawPhotos : [];
  if (rawPhotos !== undefined && !Array.isArray(rawPhotos)) return NextResponse.json({ error: "Некорректные фотографии." }, { status: 400 });
  if (photos.length > 10 || photos.some((photo) => !photo || typeof photo !== "object" || typeof photo.id !== "string" || typeof photo.name !== "string" || typeof photo.url !== "string" || !/^data:image\/(jpeg|png|gif|webp|avif);base64,/i.test(photo.url))) return NextResponse.json({ error: "Некорректные фотографии." }, { status: 400 });
  if (photos.reduce((sum, photo) => sum + photo.url.length, 0) > 24 * 1024 * 1024) return NextResponse.json({ error: "Общий размер фотографий превышает 18 МБ." }, { status: 413 });
  if ((!text && !photos.length) || text.length > 2000) return NextResponse.json({ error: "Добавьте сообщение или фотографию (текст до 2000 символов)." }, { status: 400 });
  const recipientId = ctx.user.id === ctx.order.userId
    ? (await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }))?.id
    : ctx.order.userId;
  if (!recipientId) return NextResponse.json({ error: "Не найден администратор для диалога." }, { status: 503 });
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.orderMessage.create({ data: { orderId, senderId: ctx.user.id, senderName: ctx.user.name || (ctx.user.role === "ADMIN" ? "Администратор" : "Пользователь"), senderRole: ctx.user.role === "ADMIN" ? "Администратор" : ctx.user.role === "MODERATOR" ? "Модератор" : "Пользователь", recipientId, text, photos: photos as never }, select: { id: true, senderName: true, senderRole: true, senderId: true, text: true, photos: true, createdAt: true } });
    const notificationCreated = await createNotificationIfEnabled(tx, {
      channel: "messages",
      type: "PERSONAL",
      fromUserId: ctx.user.id,
      toUserId: recipientId,
      title: "Новое сообщение по заказу",
      text: `Новое сообщение по заказу ${ctx.order.orderCode}: ${text || "Отправлена фотография."}`,
      eventKey: `order-message:${created.id}`,
    });
    return { message: created, notificationCreated };
  });
  if (result.notificationCreated) {
    await sendPushToUsers([recipientId], "messages", { title: "Новое сообщение по заказу", body: text || "Вам отправили фотографию.", url: "/notifications" });
  }
  return NextResponse.json({ message: result.message }, { status: 201 });
}
