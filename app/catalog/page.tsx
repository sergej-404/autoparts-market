import CatalogClient from "./CatalogClient";
import { prisma } from "@/lib/prisma";
import { isAllowedListingImage } from "@/lib/listing-image";
import { getCachedCatalogMakes, getCachedPublicCategories } from "@/lib/public-catalog-data";

type CatalogPageProps = { searchParams: Promise<{ category?: string | string[]; brand?: string | string[]; q?: string | string[]; query?: string | string[] }> };
function firstParam(value: string | string[] | undefined): string { return Array.isArray(value) ? (value[0] ?? "") : (value ?? ""); }

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const [listings, makes, categories] = await Promise.all([
    prisma.listing.findMany({ where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } }, include: { make: true, model: true, category: true }, orderBy: { createdAt: "desc" } }),
    getCachedCatalogMakes(),
    getCachedPublicCategories(),
  ]);
  const visibleListings = listings.map((listing) => ({ ...listing, images: listing.images.filter(isAllowedListingImage) }));
  return <CatalogClient key={firstParam(params.category)} initialCategory={firstParam(params.category)} initialBrand={firstParam(params.brand)} initialQuery={firstParam(params.q ?? params.query)} listings={visibleListings} makes={makes} categories={categories} />;
}
