import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotificationIfEnabled } from "@/lib/notification-preferences";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const { orderId } = await params;
  try {
    const pushRecipients = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId: session.user.id, status: "PENDING" },
        include: { items: true },
      });
      if (!order) throw new Error("NOT_CANCELLABLE");
      const changed = await tx.order.updateMany({
        where: { id: order.id, userId: session.user.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (changed.count !== 1) throw new Error("NOT_CANCELLABLE");
      for (const item of order.items) {
        const restored = await tx.listing.updateMany({
          where: { id: item.listingId },
          data: { quantity: { increment: item.quantity } },
        });
        if (restored.count !== 1) throw new Error("LISTING_MISSING");
        await tx.listing.updateMany({
          where: { id: item.listingId, status: "OUT_OF_STOCK", quantity: { gt: 0 } },
          data: { status: "PUBLISHED" },
        });
      }
      const administrators = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      const results = await Promise.all(administrators.map(async (administrator) => ({
        userId: administrator.id,
        created: await createNotificationIfEnabled(tx, {
          channel: "orders",
          type: "SYSTEM",
          fromUserId: session.user.id,
          toUserId: administrator.id,
          title: "Заказ отменён покупателем",
          text: `Покупатель отменил заказ ${order.orderCode}.`,
          eventKey: `order-cancelled:${order.id}:${administrator.id}`,
        }),
      })));
      return results.filter((item) => item.created).map((item) => item.userId);
    }, { isolationLevel: "Serializable" });
    await sendPushToUsers(pushRecipients, "orders", { title: "Заказ отменён покупателем", body: "Покупатель отменил заказ.", url: "/notifications" });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CANCELLABLE") return NextResponse.json({ error: "Отменить можно только свой заказ в ожидании одобрения." }, { status: 409 });
    if (error instanceof Error && error.message === "LISTING_MISSING") return NextResponse.json({ error: "Товар заказа отсутствует. Обратитесь к администратору." }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return NextResponse.json({ error: "Заказ изменился. Обновите страницу и повторите попытку." }, { status: 409 });
    console.error("Order cancellation failed", error);
    return NextResponse.json({ error: "Не удалось отменить заказ." }, { status: 500 });
  }
}
