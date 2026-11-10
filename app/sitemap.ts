import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://autoparts-market-six.vercel.app";

  const listings = await prisma.listing.findMany({
    where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50000,
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...listings.map((listing) => ({
      url: `${baseUrl}/product/${encodeURIComponent(listing.id)}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}