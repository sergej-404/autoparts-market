import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function DELETE(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const { conversationId } = await params;
  const conversation = await prisma.chatConversation.findFirst({ where: { id: conversationId, OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] }, select: { id: true, buyerId: true, sellerId: true } });
  if (!conversation) return NextResponse.json({ error: "Диалог не найден." }, { status: 404 });
  const now = new Date();
  if (conversation.buyerId === session.user.id) await prisma.chatConversation.update({ where: { id: conversationId }, data: { buyerDeletedAt: now } });
  else await prisma.chatConversation.update({ where: { id: conversationId }, data: { sellerDeletedAt: now } });
  return NextResponse.json({ success: true });
}
