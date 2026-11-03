import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [makes, categories, listings] = await Promise.all([
    prisma.carMake.findMany({ include: { models: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.listing.findMany({ where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } }, include: { make: true, model: true, category: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ makes, categories, listings });
}
