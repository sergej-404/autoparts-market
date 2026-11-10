import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAllowedListingImage } from "@/lib/listing-image";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import ProductGallery from "./ProductGallery";
import {RecordView} from "@/components/history/RecordView";
import SimilarProducts from "./SimilarProducts";
import ProductActions from "./ProductActions";
import ProductDetails, { type VehicleFit } from "./ProductDetails";

type Fit = { makeId?: string; modelId?: string | null; year?: number | null };

const getListing = cache(async (id: string) => prisma.listing.findFirst({
  where: { id, status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
  include: { make: true, model: true, category: true },
}));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Товар не найден" };

  const description = listing.description.replace(/\s+/g, " ").trim().slice(0, 160);
  const image = listing.images.find(isAllowedListingImage);
  const canonical = `/product/${encodeURIComponent(listing.id)}`;

  return {
    title: listing.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: listing.title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image, alt: listing.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: listing.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  const session = await auth.api.getSession({ headers: await headers() });
  const seller = await prisma.user.findUnique({ where: { id: listing.createdById }, select: { phone: true } });
  const related = await prisma.listing.findMany({ where: { id: { not: id }, categoryId: listing.categoryId, status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 12, include: { make: true, model: true, category: true } });
  const fits = Array.isArray(listing.compatibility) ? listing.compatibility as Fit[] : [];
  const makes = await prisma.carMake.findMany({ include: { models: true } });
  const fitMap = new Map<string, { make: string; model: string; years: Set<number> }>();
  for (const fit of (fits.length ? fits : [{ makeId: listing.makeId ?? undefined, modelId: listing.modelId, year: listing.year }])) {
    const make = makes.find(item => item.id === fit.makeId)?.name ?? listing.make?.name;
    const model = makes.find(item => item.id === fit.makeId)?.models.find(item => item.id === fit.modelId)?.name ?? listing.model?.name;
    if (!make) continue;
    const key = `${make}::${model ?? "Все модели"}`;
    if (!fitMap.has(key)) fitMap.set(key, { make, model: model ?? "Все модели", years: new Set() });
    if (typeof fit.year === "number") fitMap.get(key)!.years.add(fit.year);
  }
  const fitRows: VehicleFit[] = [...fitMap.values()].map(fit => ({ make: fit.make, model: fit.model, years: [...fit.years].sort((a, b) => a - b) }));
  const compatibleMakeIds = new Set([listing.makeId, ...fits.map(fit => fit.makeId)].filter((value): value is string => Boolean(value)));
  const interestCandidates = compatibleMakeIds.size ? await prisma.listing.findMany({ where: { id: { not: id }, status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 250, include: { make: true, model: true, category: true } }) : [];
  const interested = interestCandidates.filter(item => item.makeId && compatibleMakeIds.has(item.makeId) || (Array.isArray(item.compatibility) && (item.compatibility as Fit[]).some(fit => fit.makeId && compatibleMakeIds.has(fit.makeId)))).slice(0, 12);
  const cardData = (item: typeof related[number]) => ({ id: item.id, title: item.title, description: item.description, images: item.images.filter(isAllowedListingImage), year: item.year, price: item.price, quantity: item.quantity, status: item.status, make: item.make ? { name: item.make.name } : null, model: item.model ? { name: item.model.name } : null, category: { name: item.category.name } });
  const messageUrl = session && listing.createdById === session.user.id ? null : session ? `/chat?sellerId=${encodeURIComponent(listing.createdById)}&listingId=${encodeURIComponent(listing.id)}` : "/login";
  const contact = <><Link href="/catalog" className="inline-flex min-w-0 flex-1 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-center text-xs font-bold sm:text-sm">Вернуться в каталог</Link>{messageUrl ? <Link href={messageUrl} className="inline-flex min-w-0 flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-3 text-center text-xs font-bold text-white sm:text-sm">Написать продавцу</Link> : <span className="inline-flex flex-1 items-center justify-center text-sm text-[var(--muted)]">Это ваш товар</span>}{seller?.phone && <a href={`tel:${seller.phone.replace(/[^\d+]/g, "")}`} aria-label="Позвонить продавцу" title="Позвонить продавцу" className="inline-flex w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xl md:hidden">📞</a>}</>;
  return <main className="mx-auto max-w-7xl px-4 pb-32 pt-5 sm:px-6 md:pb-10 lg:px-8">
    <RecordView id={id}/>
    <nav aria-label="Хлебные крошки" className="mb-5 flex min-w-0 items-center gap-2 text-xs text-[var(--muted)] sm:text-sm"><Link href="/">Главная</Link><span>·</span><Link href="/catalog">Каталог</Link><span>·</span><span className="min-w-0 truncate text-[var(--foreground)]">{listing.title}</span></nav>
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2 lg:gap-10">
      <div className="min-w-0"><ProductGallery images={listing.images.filter(isAllowedListingImage)} title={listing.title} /></div>
      <section className="min-w-0"><p className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">{listing.category.name}</p><h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">{listing.title}</h1><div className="mt-5 flex flex-wrap items-center gap-4"><p className="text-3xl font-black">{listing.price.toLocaleString("ru-RU")} ₽</p><p className={`rounded-full px-3 py-1 text-xs font-bold ${listing.status === "OUT_OF_STOCK" || listing.quantity <= 0 ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}>{listing.status === "OUT_OF_STOCK" || listing.quantity <= 0 ? "Нет в наличии" : `● В наличии: ${listing.quantity} шт.`}</p></div>
      <p className="mt-3 break-all text-xs text-[var(--muted)]">Артикул товара: <span className="font-semibold text-[var(--foreground)]">{listing.id}</span></p>
      <ProductActions id={listing.id} title={listing.title} price={listing.price} quantity={listing.quantity} unavailable={listing.status === "OUT_OF_STOCK" || listing.quantity <= 0} />
      <div className="mt-6 hidden gap-3 lg:flex">{contact}</div></section>
    </div>
    <ProductDetails fits={fitRows} description={listing.description} />
    <SimilarProducts title="Похожее" items={related.map(cardData)} />
    <SimilarProducts title="Может заинтересовать" items={interested.map(cardData)} />
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-[var(--line)] bg-[var(--background)]/95 px-3 py-2 shadow-lg backdrop-blur md:hidden">{contact}</div>
  </main>;
}
