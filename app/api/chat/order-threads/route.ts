import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ threads: [] }, { headers: { "Cache-Control": "no-store" } });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!user) return NextResponse.json({ threads: [] });
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  // A conversation appears only after its first message; empty orders do not clutter the chat list.
  const orders = await prisma.order.findMany({
    where: { ...(isStaff ? {} : { userId: session.user.id }), messages: { some: {} } },
    select: {
      id: true, orderCode: true, customerName: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, photos: true, createdAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const hiddenRows = await prisma.orderThreadHidden.findMany({ where: { userId: session.user.id } });
  const hiddenMap = new Map(hiddenRows.map((row) => [row.orderId, row.hiddenAt.getTime()]));
  const visibleOrders = orders.filter((order) => !hiddenMap.has(order.id) || order.messages[0].createdAt.getTime() > hiddenMap.get(order.id)!);
  const ids = visibleOrders.map((order) => order.id);
  const unread = ids.length ? await prisma.orderMessage.groupBy({
    by: ["orderId"], where: { orderId: { in: ids }, recipientId: session.user.id, readAt: null }, _count: { _all: true },
  }) : [];
  const unreadMap = new Map(unread.map((item) => [item.orderId, item._count._all]));
  const threads = visibleOrders.map((order) => {
    const last = order.messages[0];
    return {
      id: order.id, orderCode: order.orderCode,
      customerName: isStaff ? order.customerName : "Администрация магазина",
      preview: last.text || (Array.isArray(last.photos) && last.photos.length ? "Фотография" : "Сообщение"),
      time: last.createdAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }),
      unread: unreadMap.get(order.id) ?? 0,
      updatedAt: last.createdAt.getTime(),
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
  return NextResponse.json({ threads }, { headers: { "Cache-Control": "no-store" } });
}
