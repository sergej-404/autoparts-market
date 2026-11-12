import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRussianPhone } from "@/lib/phone";
import { createNotificationIfEnabled } from "@/lib/notification-preferences";
import { sendPushToUsers } from "@/lib/web-push";

export const runtime = "nodejs";

const prefixes = ["ZK", "KY", "XE", "PM", "SS", "QQ"] as const;
const MAX_DATABASE_INT = 2_147_483_647;
function makeOrderCode() {
  const prefix = prefixes[randomInt(prefixes.length)];
  return `${prefix}-${Array.from({ length: 5 }, () => randomInt(10)).join("")}`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Необходима авторизация." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные заказа." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "";
  const phone = typeof data.phone === "string" ? normalizeRussianPhone(data.phone) : null;
  const fulfillment = data.fulfillment;
  const meetingPlace = typeof data.meetingPlace === "string" ? data.meetingPlace.trim() : "";
  const itemsRaw = data.items;
  if (customerName.length < 3 || customerName.length > 160 || !phone) return NextResponse.json({ error: "Укажите ФИО и корректный телефон +7." }, { status: 400 });
  if (fulfillment !== "PICKUP" && fulfillment !== "OWN_PLACE") return NextResponse.json({ error: "Выберите способ получения." }, { status: 400 });
  if (fulfillment === "OWN_PLACE" && (!meetingPlace || meetingPlace.length > 500)) return NextResponse.json({ error: "Укажите удобное место встречи (до 500 символов)." }, { status: 400 });
  if (!Array.isArray(itemsRaw) || !itemsRaw.length || itemsRaw.length > 100) return NextResponse.json({ error: "В заказе должны быть выбранные товары." }, { status: 400 });
  const quantities = new Map<string, number>();
  for (const item of itemsRaw) {
    if (!item || typeof item !== "object") return NextResponse.json({ error: "Некорректный товар." }, { status: 400 });
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id || !Number.isSafeInteger(row.quantity) || (row.quantity as number) < 1 || (row.quantity as number) > 10000) return NextResponse.json({ error: "Некорректное количество товара." }, { status: 400 });
    const combined = (quantities.get(row.id) ?? 0) + (row.quantity as number);
    if (!Number.isSafeInteger(combined) || combined > 10000) return NextResponse.json({ error: "Слишком большое количество одного товара." }, { status: 400 });
    quantities.set(row.id, combined);
  }
  // Reserve stock when the customer places an order, not when it is completed.
  // The conditional decrement and order creation share one serializable transaction.
  for (let attempt = 0; attempt < 10; attempt++) {
    const orderCode = makeOrderCode();
    try {
      const result = await prisma.$transaction(async (tx) => {
        const pushAdministratorIds: string[] = [];
        const listings = await tx.listing.findMany({
          where: { id: { in: [...quantities.keys()] }, status: "PUBLISHED" },
          select: { id: true, title: true, price: true, quantity: true },
        });
        if (listings.length !== quantities.size) throw new Error("LISTING_UNAVAILABLE");
        const items = listings.map((listing) => {
          const quantity = quantities.get(listing.id) ?? 0;
          if (listing.quantity < quantity) throw new Error(`INSUFFICIENT_STOCK:${listing.title}`);
          const lineTotal = listing.price * quantity;
          if (!Number.isSafeInteger(lineTotal) || lineTotal > MAX_DATABASE_INT) throw new Error("INVALID_TOTAL");
          return { listingId: listing.id, title: listing.title, quantity, unitPrice: listing.price, lineTotal };
        });
        for (const item of items) {
          const changed = await tx.listing.updateMany({
            where: { id: item.listingId, status: "PUBLISHED", quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (changed.count !== 1) throw new Error(`INSUFFICIENT_STOCK:${item.title}`);
          await tx.listing.updateMany({
            where: { id: item.listingId, quantity: 0, status: "PUBLISHED" },
            data: { status: "OUT_OF_STOCK" },
          });
        }
        const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
        if (!Number.isSafeInteger(total) || total > MAX_DATABASE_INT) throw new Error("INVALID_TOTAL");
        const createdOrder = await tx.order.create({ data: {
          orderCode, userId: session.user.id, customerName, phone,
          fulfillment, meetingPlace: fulfillment === "OWN_PLACE" ? meetingPlace : null,
          total, items: { create: items },
        }, include: { items: true } });
        const buyerNotificationCreated = await createNotificationIfEnabled(tx, {
          channel: "orders",
          type: "SYSTEM",
          fromUserId: null,
          toUserId: session.user.id,
          title: "Заказ оформлен",
          text: `Заказ ${createdOrder.orderCode} успешно оформлен и ожидает подтверждения.`,
          eventKey: `order-created:${createdOrder.id}:${session.user.id}`,
        });
        const pushBuyer = buyerNotificationCreated;
        const administrators = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
        const administratorResults = await Promise.all(administrators.map(async (administrator) => ({
          userId: administrator.id,
          created: await createNotificationIfEnabled(tx, {
            channel: "orders",
            type: "SYSTEM",
            fromUserId: session.user.id,
            toUserId: administrator.id,
            title: "Новый заказ",
            text: `Поступил новый заказ ${createdOrder.orderCode}. Проверьте его в панели управления.`,
            eventKey: `new-order:${createdOrder.id}:${administrator.id}`,
          }),
        })));
        pushAdministratorIds.push(...administratorResults.filter((item) => item.created).map((item) => item.userId));
        return { order: createdOrder, pushBuyer, pushAdministratorIds };
      }, { isolationLevel: "Serializable" });
      revalidateTag("public-home-listings", { expire: 0 });
      revalidatePath("/");
      if (result.pushBuyer) {
        await sendPushToUsers([session.user.id], "orders", {
          title: "Заказ оформлен",
          body: `Заказ ${result.order.orderCode} успешно оформлен и ожидает подтверждения.`,
          url: "/notifications",
        });
      }
      await sendPushToUsers(result.pushAdministratorIds, "orders", {
        title: "Новый заказ",
        body: `Поступил новый заказ ${result.order.orderCode}. Проверьте его в панели управления.`,
        url: "/notifications",
      });
      return NextResponse.json({ order: result.order }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "LISTING_UNAVAILABLE") return NextResponse.json({ error: "Один из товаров больше недоступен." }, { status: 409 });
      if (message.startsWith("INSUFFICIENT_STOCK:")) return NextResponse.json({ error: `Недостаточно товара «${message.slice("INSUFFICIENT_STOCK:".length)}» в наличии.` }, { status: 409 });
      if (message === "INVALID_TOTAL") return NextResponse.json({ error: "Некорректная сумма заказа." }, { status: 400 });
      if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2002" || error.code === "P2034")) continue;
      console.error("Order creation failed", error);
      return NextResponse.json({ error: "Не удалось оформить заказ." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Остатки товаров изменились. Обновите корзину и повторите попытку." }, { status: 409 });
}
