import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HomeListingCarousel } from "@/components/home/HomeListingCarousel";
import { isAllowedListingImage } from "@/lib/listing-image";
import { getCachedHomeListings, getCachedPublicCategories, getCachedPublicMakes } from "@/lib/public-catalog-data";
import { logPerformanceDuration, measurePerformance, startPerformanceTimer } from "@/lib/performance-diagnostics";

export const revalidate = 60;

const categoryFallbackEmojis = ["🔧", "⚙️", "🛞", "🚗", "🔋", "💡", "🛠️", "🔩"];

export default async function HomePage() {
  const requestStartedAt = startPerformanceTimer();
  const [categories, cachedPopularListings, carMakes] = await Promise.all([
    measurePerformance("home.categories_cache", getCachedPublicCategories()),
    measurePerformance("home.popular_listings_cache", getCachedHomeListings()),
    measurePerformance("home.makes_cache", getCachedPublicMakes()),
  ]);
  const popularListings = cachedPopularListings.map((listing) => ({
    ...listing,
    images: listing.images.filter(isAllowedListingImage),
  }));
  logPerformanceDuration("home.data_ready", requestStartedAt);
  // This project has no order/checkout records yet, so sales hits cannot be ranked without inventing sales data.
  const hitListings: typeof cachedPopularListings = [];
  return (
    <main className="pb-12">
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-7">
        <div className="relative isolate min-h-[390px] overflow-hidden rounded-2xl border border-[var(--line)] sm:min-h-[440px] lg:min-h-[500px]">
          <Image
            src="/brand/gelandewagen-goldenes-bergtal.png"
            alt="Внедорожник в золотой горной долине"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1280px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080b0e]/95 via-[#080b0e]/65 to-[#080b0e]/10" />
          <div className="relative flex min-h-[390px] max-w-2xl flex-col items-start justify-center px-6 py-12 sm:min-h-[440px] sm:px-10 lg:min-h-[500px] lg:px-14">
            <span className="rounded-full border border-[var(--accent)]/40 bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">AXION X · каталог запчастей</span>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">Автозапчасти для любых дорог</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-gray-200 sm:text-lg">Надежные детали, проверенные поставщики, выгодные цены.</p>
            <Link href="/catalog" className="mt-8 inline-flex items-center gap-3 rounded-xl bg-[var(--accent)] px-5 py-3.5 font-bold text-white transition hover:bg-[var(--accent-hover)]">
              Перейти в каталог <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <SectionHeading eyebrow="Подбор по разделам" title="Категории запчастей" actionLabel="Весь каталог" />
        <div className="mt-6 grid grid-flow-col grid-rows-2 auto-cols-[calc((100%-12px)/2)] gap-3 overflow-x-auto pb-3 lg:auto-cols-[calc((100%-48px)/5)]">
          {categories.map((category, index) => {
            const emoji = category.emoji || categoryFallbackEmojis[index % categoryFallbackEmojis.length];
            return (
              <Link key={category.name} href={`/catalog?category=${encodeURIComponent(category.name)}`} className="group flex min-w-0 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2.5 transition hover:border-[var(--accent)]/70 sm:gap-3 sm:px-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:h-14 sm:w-14 [&_img]:block [&_img]:!h-full [&_img]:!w-full [&_img]:object-contain [&_span]:flex [&_span]:h-full [&_span]:w-full [&_span]:items-center [&_span]:justify-center" aria-hidden="true">
                  <CategoryIcon value={emoji} size={56} />
                </span>
                <span className="min-w-0 flex-1 text-left text-xs font-semibold leading-snug sm:text-sm break-words">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <SectionHeading eyebrow="Выбор покупателей" title="Популярные товары" actionLabel="Смотреть каталог" />
          <HomeListingCarousel listings={popularListings} label="Популярные товары" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="relative isolate overflow-hidden rounded-2xl border border-[var(--line)]">
          <Image
            src="/brand/dramatische-autoteile.png"
            alt="Автозапчасти в драматичном индустриальном освещении"
            width={1600}
            height={650}
            sizes="(max-width: 768px) 100vw, 1280px"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080b0e]/95 via-[#080b0e]/75 to-[#080b0e]/25" />
          <div className="relative max-w-xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Нужная деталь — без лишнего поиска</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Всё для уверенного движения</h2>
            <p className="mt-4 max-w-md leading-7 text-gray-200">Подберите запчасти и комплектующие для своего автомобиля в каталоге AXION X.</p>
            <Link href="/catalog" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20">
              Подробнее <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-2 pt-2 sm:px-6 lg:px-8 lg:pb-4">
        <SectionHeading eyebrow="Подбор по автомобилю" title="Марки автомобилей" actionLabel="Все марки" />
        <div className="mt-6 flex gap-3 overflow-x-auto pb-3">
          {carMakes.map(({ name: brand }) => (
            <Link key={brand} href={`/catalog?brand=${encodeURIComponent(brand)}`} className="flex min-w-32 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 text-sm font-extrabold tracking-wide transition hover:border-[var(--accent)]/70 sm:min-w-40">
              {brand}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <SectionHeading eyebrow="Чаще всего выбирают" title="Хиты продаж" actionLabel="Весь каталог" />
        <div className="mt-6">{hitListings.length > 0 ? <HomeListingCarousel listings={hitListings} label="Хиты продаж" /> : <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-sm text-[var(--muted)]">Пока нет завершённых оплаченных заказов для формирования списка хитов продаж.</p>}</div>
      </section>
    </main>
  );
}

function SectionHeading({ eyebrow, title, actionLabel }: { eyebrow: string; title: string; actionLabel: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <Link href="/catalog" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] sm:text-sm">
        {actionLabel} <ArrowRight size={15} />
      </Link>
    </div>
  );
}
