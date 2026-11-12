import { RecentlyViewed } from "@/components/history/RecentlyViewed";
import { AuthorizationRequired } from "@/components/auth/AuthorizationRequired";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import CartClient from "./CartClient";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Заказ", description: "Товары, добавленные в заказ AXION X." };

export default async function CartPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AuthorizationRequired />;

  const listings = await prisma.listing.findMany({
    where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
    include: { make: true, model: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  return <><CartClient listings={listings} /><RecentlyViewed listings={listings} /></>;
}
