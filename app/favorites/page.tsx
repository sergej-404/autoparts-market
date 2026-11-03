import {RecentlyViewed} from "@/components/history/RecentlyViewed";
import type { Metadata } from "next";
import FavoritesClient from "@/app/favorites/FavoritesClient";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохранённые товары в избранном AXION X.",
};

export default async function Page() {
  const listings = await prisma.listing.findMany({ where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } }, include: { make: true, model: true, category: true }, orderBy: { createdAt: "desc" } });
  return <><FavoritesClient listings={listings} /><RecentlyViewed listings={listings} /></>;
}
