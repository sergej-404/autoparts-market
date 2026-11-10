import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAllowedListingImage } from "@/lib/listing-image";
import { getCachedCatalogMakes, getCachedPublicCategories } from "@/lib/public-catalog-data";

export async function GET() {
  const [makes, categories, listings] = await Promise.all([
    getCachedCatalogMakes(),
    getCachedPublicCategories(),
    prisma.listing.findMany({ where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } }, include: { make: true, model: true, category: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const visibleListings = listings.map((listing) => ({ ...listing, images: listing.images.filter(isAllowedListingImage) }));
  return NextResponse.json({ makes, categories, listings: visibleListings }, { headers: { "Cache-Control": "no-store" } });
}
