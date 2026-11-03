import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, image: true } }) : null;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const url = new URL(request.url);
  const selectedConversationId = url.searchParams.get("conversationId");
  if (selectedConversationId) {
    const selected = await prisma.chatConversation.findFirst({ where: { id: selectedConversationId, OR: [{ buyerId: user.id, buyerDeletedAt: null }, { sellerId: user.id, sellerDeletedAt: null }] }, select: { id: true } });
    if (selected) await prisma.chatMessage.updateMany({ where: { conversationId: selected.id, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } });
  }
  const conversations = await prisma.chatConversation.findMany({
    where: { messages: { some: {} }, OR: [{ buyerId: user.id, buyerDeletedAt: null }, { sellerId: user.id, sellerDeletedAt: null }] },
    include: { buyer: { select: { id: true, name: true, image: true, publicId: true } }, seller: { select: { id: true, name: true, image: true, publicId: true } }, listing: { select: { id: true, title: true, price: true } }, messages: { orderBy: { createdAt: "asc" }, take: 200, include: { sender: { select: { id: true } } } } },
    orderBy: { updatedAt: "desc" }, take: 100,
  });
  return NextResponse.json({ currentUserId: user.id, conversations: conversations.map((chat) => ({ ...chat, otherUser: chat.buyerId === user.id ? chat.seller : chat.buyer })) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.sellerId !== "string" || typeof data.listingId !== "string") return NextResponse.json({ error: "Не указан продавец или товар." }, { status: 400 });
  if (data.sellerId === user.id) return NextResponse.json({ error: "Нельзя написать самому себе." }, { status: 400 });
  const listing = await prisma.listing.findFirst({ where: { id: data.listingId, createdById: data.sellerId, status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } }, select: { id: true } });
  if (!listing) return NextResponse.json({ error: "Товар или продавец не найдены." }, { status: 404 });
  const seller = await prisma.user.findUnique({ where: { id: data.sellerId }, select: { id: true } });
  if (!seller) return NextResponse.json({ error: "Продавец не найден." }, { status: 404 });
  // PostgreSQL transaction advisory lock serializes simultaneous POST requests for this buyer/listing.
  // This also prevents duplicate creation when React development effects run twice.
  const conversation = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`chat:${user.id}:${seller.id}:${listing.id}`}))`;
    const existing = await tx.chatConversation.findFirst({
      where: { buyerId: user.id, sellerId: seller.id, listingId: listing.id, buyerDeletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return existing ?? tx.chatConversation.create({ data: { buyerId: user.id, sellerId: seller.id, listingId: listing.id } });
  });
  const fullConversation = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id }, include: { buyer: { select: { id: true, name: true, image: true, publicId: true } }, seller: { select: { id: true, name: true, image: true, publicId: true } }, listing: { select: { id: true, title: true, price: true } }, messages: { orderBy: { createdAt: "asc" }, take: 200, include: { sender: { select: { id: true } } } } } });
  return NextResponse.json({ conversation: { ...fullConversation, otherUser: fullConversation.buyerId === user.id ? fullConversation.seller : fullConversation.buyer } }, { status: 200 });
}
