import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_QUERY_LENGTH = 80;
const MAX_SUGGESTIONS = 5;

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
  const tokens = query.split(" ").filter(Boolean);

  if (tokens.length === 0 || query.length < 2) {
    return NextResponse.json({ categories: [], listings: [] });
  }

  try {
    const [categories, listings] = await Promise.all([
      prisma.productCategory.findMany({
        where: {
          AND: tokens.map((token) => ({ name: { contains: token, mode: "insensitive" } })),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: MAX_SUGGESTIONS,
      }),
      prisma.listing.findMany({
        where: {
          status: { in: ["PUBLISHED", "OUT_OF_STOCK"] },
          AND: tokens.map((token) => ({
            OR: [
              { id: { contains: token, mode: "insensitive" } },
              { title: { contains: token, mode: "insensitive" } },
              { description: { contains: token, mode: "insensitive" } },
              { category: { is: { name: { contains: token, mode: "insensitive" } } } },
            ],
          })),
        },
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          category: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_SUGGESTIONS,
      }),
    ]);

    return NextResponse.json({
      categories,
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        image: listing.images[0] ?? null,
        category: listing.category.name,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Search suggestions failed:", error);
    return NextResponse.json({ error: "Не удалось выполнить поиск" }, { status: 500 });
  }
}
