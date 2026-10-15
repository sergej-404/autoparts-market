import { ArrowRight, ChevronRight, Disc3, Lightbulb, Settings2, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/cards/ProductCard";
import { categories, featuredProducts, bestSellingProducts, carBrands } from "./data/home";

const categoryIcons = [Settings2, Disc3, Lightbulb, Wrench];

export default function HomePage() {
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
        <div className="mt-6 grid auto-cols-[calc(50%-6px)] grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-3 sm:auto-cols-[calc(33.333%-8px)] lg:auto-cols-[calc(25%-9px)]">
          {categories.map((category, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <Link key={category.title} href={`/catalog?category=${encodeURIComponent(category.title)}`} className="group flex min-h-24 flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]/70">
                <Icon size={22} className="text-[var(--accent)]" />
                <span className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold">{category.title}<ChevronRight size={15} className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <SectionHeading eyebrow="Выбор покупателей" title="Популярные товары" actionLabel="Смотреть каталог" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-2">
            {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
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
          {carBrands.map((brand) => (
            <Link key={brand} href={`/catalog?brand=${encodeURIComponent(brand)}`} className="flex min-w-32 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 text-sm font-extrabold tracking-wide transition hover:border-[var(--accent)]/70 sm:min-w-40">
              {brand}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <SectionHeading eyebrow="Чаще всего выбирают" title="Хиты продаж" actionLabel="Весь каталог" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-2">
          {bestSellingProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
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
