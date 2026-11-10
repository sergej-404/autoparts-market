import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ count: 0, notificationsUnreadCount: 0 });

  const id = session.user.id;
  const [preferences, hidden, notificationsUnreadCount] = await Promise.all([
    prisma.notificationPreference.findUnique({ where: { userId: id }, select: { messages: true } }),
    prisma.orderThreadHidden.findMany({ where: { userId: id }, select: { orderId: true, hiddenAt: true } }),
    prisma.notification.count({ where: { toUserId: id, readAt: null } }),
  ]);

  if (preferences && !preferences.messages) {
    return NextResponse.json({ count: 0, notificationsUnreadCount });
  }

  const [chatCount, orderCount] = await Promise.all([
    prisma.chatMessage.count({
      where: {
        senderId: { not: id },
        readAt: null,
        conversation: {
          OR: [
            { buyerId: id, buyerDeletedAt: null },
            { sellerId: id, sellerDeletedAt: null },
          ],
        },
      },
    }),
    prisma.orderMessage.count({
      where: {
        recipientId: id,
        readAt: null,
        AND: hidden.map((row) => ({ NOT: { orderId: row.orderId, createdAt: { lte: row.hiddenAt } } })),
      },
    }),
  ]);

  return NextResponse.json({ count: chatCount + orderCount, notificationsUnreadCount });
}
