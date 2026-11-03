import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const { orderId } = await params;
  const [order, user] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
  ]);
  if (!order || !user || (order.userId !== session.user.id && user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Переписка не найдена." }, { status: 404 });
  }
  const hiddenAt = new Date();
  await prisma.$transaction([
    prisma.orderThreadHidden.upsert({ where: { orderId_userId: { orderId, userId: session.user.id } }, create: { orderId, userId: session.user.id, hiddenAt }, update: { hiddenAt } }),
    prisma.orderMessage.updateMany({ where: { orderId, recipientId: session.user.id, readAt: null }, data: { readAt: hiddenAt } }),
  ]);
  return NextResponse.json({ success: true });
}
