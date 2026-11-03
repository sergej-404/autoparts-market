import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentPrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import SellerProfileClient from "./SellerProfileClient";

export const metadata: Metadata = { title: "Профиль продавца" };

export default async function SellerProfilePage() {
  const principal = await getCurrentPrincipal();
  if (!principal || (principal.role !== "ADMIN" && principal.role !== "MODERATOR")) {
    return <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-black">Профиль продавца</h1>
      <p className="mt-3 text-[var(--muted)]">Доступно только для продавцов</p>
      <Link href="/chat" className="mt-6 inline-flex rounded-xl border border-[var(--line)] px-4 py-2 font-semibold hover:border-[var(--accent)]">Вернуться в сообщения</Link>
    </main>;
  }
  const listings = await prisma.listing.findMany({
    where: { status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
    include: { make: true, model: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  return <SellerProfileClient listings={listings} />;
}
