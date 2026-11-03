import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotificationIfEnabled } from "@/lib/notification-preferences";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

type Photo = { id: string; name: string; url: string };
export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const { conversationId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const text = typeof data.text === "string" ? data.text.trim() : "";
  const photos = Array.isArray(data.photos) ? data.photos as Photo[] : [];
  if (!text && photos.length === 0) return NextResponse.json({ error: "Добавьте текст или фотографию." }, { status: 400 });
  if (text.length > 250) return NextResponse.json({ error: "Максимум 250 символов в сообщении." }, { status: 400 });
  if (photos.length > 10 || photos.some((photo) => !photo || typeof photo.name !== "string" || typeof photo.url !== "string" || !/^data:image\/(jpeg|png|gif|webp|avif);base64,/i.test(photo.url))) return NextResponse.json({ error: "Некорректные фотографии." }, { status: 400 });
  if (photos.reduce((sum, photo) => sum + photo.url.length, 0) > 24 * 1024 * 1024) return NextResponse.json({ error: "Общий размер фотографий превышает лимит 18 МБ." }, { status: 413 });
  const conversation = await prisma.chatConversation.findFirst({ where: { id: conversationId, OR: [{ buyerId: session.user.id, buyerDeletedAt: null }, { sellerId: session.user.id, sellerDeletedAt: null }] }, select: { id: true, buyerId: true, sellerId: true, listingId: true, buyerDeletedAt: true, sellerDeletedAt: true } });
  if (!conversation) return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
  // Keep replies in the same conversation, even if the recipient previously hid it.
  // Restore visibility for both participants rather than creating a duplicate thread.
  const targetConversation = conversation;
  const recipientId = session.user.id === targetConversation.buyerId ? targetConversation.sellerId : targetConversation.buyerId;
  const result = await prisma.$transaction(async (tx) => {
    await tx.chatConversation.update({ where: { id: targetConversation.id }, data: { buyerDeletedAt: null, sellerDeletedAt: null } });
    const created = await tx.chatMessage.create({ data: { conversationId: targetConversation.id, senderId: session.user.id, text, photos: photos as never } });
    await tx.chatConversation.update({ where: { id: targetConversation.id }, data: { updatedAt: new Date() } });
    const notificationCreated = await createNotificationIfEnabled(tx, {
      channel: "messages",
      type: "PERSONAL",
      fromUserId: session.user.id,
      toUserId: recipientId,
      title: "Новое сообщение",
      text: text || "Вам отправили фотографию в чате.",
      eventKey: `chat-message:${created.id}`,
    });
    return { message: created, notificationCreated };
  });
  if (result.notificationCreated) {
    await sendPushToUsers([recipientId], "messages", { title: "Новое сообщение", body: text || "Вам отправили фотографию в чате.", url: "/notifications" });
  }
  return NextResponse.json({ message: result.message, conversationId: targetConversation.id }, { status: 201 });
}
