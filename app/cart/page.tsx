import {RecentlyViewed} from "@/components/history/RecentlyViewed";
import type { Metadata } from "next";
import CartClient from "./CartClient";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Заказ", description: "Товары, добавленные в заказ AXION X." };

export default async function CartPage() {
  const listings = await prisma.listing.findMany({ where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } }, include: { make: true, model: true, category: true }, orderBy: { createdAt: "desc" } });
  return <><CartClient listings={listings} /><RecentlyViewed listings={listings} /></>;
}
