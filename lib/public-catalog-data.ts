import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const performanceDiagnosticsEnabled = process.env.AXION_PERFORMANCE_DIAGNOSTICS === "true";

function logPerformance(operation: string, startedAt: number) {
  if (!performanceDiagnosticsEnabled) return;
  console.info("[AXION_PERF]", JSON.stringify({
    operation,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
  }));
}

export const getCachedHomeListings = unstable_cache(
  async () => {
    const queryStartedAt = performance.now();
    const [favoriteCounts, recentListings] = await Promise.all([
      prisma.listingFavoriteEvent.groupBy({
        by: ["listingId"],
        _count: { listingId: true },
        orderBy: { _count: { listingId: "desc" } },
        take: 12,
      }),
      prisma.listing.findMany({
        where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
        include: { make: true, model: true, category: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);
    logPerformance("home.listings.initial_queries", queryStartedAt);

    const favoriteCountByListing = new Map(
      favoriteCounts.map((item) => [item.listingId, item._count.listingId]),
    );
    const favoriteIds = favoriteCounts.map((item) => item.listingId);
    const favoriteQueryStartedAt = performance.now();
    const favoriteListings = favoriteIds.length
      ? await prisma.listing.findMany({
          where: {
            id: { in: favoriteIds },
            status: { in: ["PUBLISHED", "OUT_OF_STOCK"] },
          },
          include: { make: true, model: true, category: true },
        })
      : [];
    logPerformance("home.listings.favorite_details_query", favoriteQueryStartedAt);

    const favoriteListingsById = new Map(
      favoriteListings.map((listing) => [listing.id, listing]),
    );
    return [
      ...favoriteIds
        .map((id) => favoriteListingsById.get(id))
        .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing)),
      ...recentListings.filter((listing) => !favoriteCountByListing.has(listing.id)),
    ]
      .slice(0, 12);
  },
  ["public-home-listings-v1"],
  { revalidate: 60, tags: ["public-home-listings"] },
);

export const getCachedPublicCategories = unstable_cache(
  async () => prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
  ["public-catalog-categories-v1"],
  { revalidate: 3600, tags: ["public-catalog-categories"] },
);

export const getCachedPublicMakes = unstable_cache(
  async () => prisma.carMake.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  }),
  ["public-catalog-makes-v1"],
  { revalidate: 3600, tags: ["public-catalog-makes"] },
);

export const getCachedCatalogMakes = unstable_cache(
  async () => prisma.carMake.findMany({
    include: { models: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  }),
  ["public-catalog-makes-with-models-v1"],
  { revalidate: 3600, tags: ["public-catalog-makes"] },
);
