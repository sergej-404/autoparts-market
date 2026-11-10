import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).listingId !== "string") {
    return NextResponse.json({ error: "Не указано объявление." }, { status: 400 });
  }

  const listingId = (body as { listingId: string }).listingId;
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
    select: { id: true },
  });
  if (!listing) return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });

  await prisma.listingFavoriteEvent.create({ data: { listingId } });
  return NextResponse.json({ success: true }, { status: 201 });
}
