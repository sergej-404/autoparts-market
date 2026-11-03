import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { createNotificationIfEnabled } from "@/lib/notification-preferences";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

async function isAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  const orders = await prisma.order.findMany({ include: { items: true, user: { select: { id: true, publicId: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ orders });
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const requestedStatus = data.status;
  if (typeof data.id !== "string" || (requestedStatus !== "APPROVED" && requestedStatus !== "COMPLETED" && requestedStatus !== "CANCELLED")) return NextResponse.json({ error: "Некорректный статус заказа." }, { status: 400 });
  const status: OrderStatus = requestedStatus;
  const pickupAddress = typeof data.pickupAddress === "string" ? data.pickupAddress.trim() : "";
  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: data.id as string }, include: { items: true } });
      if (!existing) throw new Error("ORDER_NOT_FOUND");
      const allowed = (existing.status === "PENDING" && (status === "APPROVED" || status === "CANCELLED"))
        || (existing.status === "APPROVED" && (status === "COMPLETED" || status === "CANCELLED"));
      if (!allowed) throw new Error("INVALID_ORDER_TRANSITION");
      if (status === "APPROVED" && existing.fulfillment === "PICKUP" && (!pickupAddress || pickupAddress.length > 500)) {
        throw new Error("PICKUP_ADDRESS_REQUIRED");
      }

      // Stock was reserved atomically during order creation.
      // Approval and completion must not change it a second time.
      if (status === "CANCELLED") {
        for (const item of existing.items) {
          const restored = await tx.listing.updateMany({
            where: { id: item.listingId },
            data: { quantity: { increment: item.quantity } },
          });
          if (restored.count !== 1) throw new Error(`LISTING_MISSING:${item.title}`);
          await tx.listing.updateMany({
            where: { id: item.listingId, status: "OUT_OF_STOCK", quantity: { gt: 0 } },
            data: { status: "PUBLISHED" },
          });
        }
      }

      const updated = await tx.order.updateMany({
        where: { id: existing.id, status: existing.status },
        data: {
          status,
          ...(status === "APPROVED" && existing.fulfillment === "PICKUP" ? { pickupAddress } : {}),
        },
      });
      if (updated.count !== 1) throw new Error("INVALID_ORDER_TRANSITION");
      const statusMessages: Record<OrderStatus, { title: string; text: string }> = {
        PENDING: { title: "Заказ ожидает подтверждения", text: `Заказ ${existing.orderCode} ожидает подтверждения.` },
        APPROVED: {
          title: "Заказ подтверждён",
          text: status === "APPROVED" && existing.fulfillment === "PICKUP" && pickupAddress
            ? `Заказ ${existing.orderCode} подтверждён. Место самовывоза: ${pickupAddress}`
            : `Заказ ${existing.orderCode} подтверждён.`,
        },
        COMPLETED: { title: "Заказ завершён", text: `Заказ ${existing.orderCode} отмечен как завершённый.` },
        CANCELLED: { title: "Заказ отменён", text: `Заказ ${existing.orderCode} отменён.` },
      };
      const notification = statusMessages[status];
      const notificationCreated = await createNotificationIfEnabled(tx, {
        channel: "orders",
        type: "SYSTEM",
        toUserId: existing.userId,
        title: notification.title,
        text: notification.text,
        eventKey: `order-status:${existing.id}:${existing.userId}:${status}`,
      });
      const updatedOrder = await tx.order.findUniqueOrThrow({ where: { id: existing.id }, include: { items: true } });
      return { order: updatedOrder, pushRecipientId: notificationCreated ? existing.userId : null, pushTitle: notification.title, pushText: notification.text };
    }, { isolationLevel: "Serializable" });
    if (order.pushRecipientId) {
      await sendPushToUsers([order.pushRecipientId], "orders", { title: order.pushTitle, body: order.pushText, url: "/notifications" });
    }
    return NextResponse.json({ order: order.order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
    if (message === "INVALID_ORDER_TRANSITION") return NextResponse.json({ error: "Недопустимый переход статуса заказа." }, { status: 409 });
    if (message === "PICKUP_ADDRESS_REQUIRED") return NextResponse.json({ error: "Для одобрения самовывоза укажите адрес (до 500 символов)." }, { status: 400 });
    if (message.startsWith("LISTING_MISSING:")) return NextResponse.json({ error: `Товар «${message.slice("LISTING_MISSING:".length)}» отсутствует. Возврат остатка невозможен, заказ не изменён.` }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Заказ или объявление не найдено." }, { status: 404 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return NextResponse.json({ error: "Остаток или статус заказа одновременно изменился. Обновите список и повторите действие." }, { status: 409 });
    console.error("Admin order update failed", error);
    return NextResponse.json({ error: "Не удалось изменить заказ." }, { status: 500 });
  }
}
