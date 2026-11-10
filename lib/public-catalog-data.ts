import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

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
