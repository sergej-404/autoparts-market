import { ArrowRight, Search, ShieldCheck, Store, Wrench } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { categories, featuredProducts } from "@/data/home";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-[var(--line)] bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
            <div>
              <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-[var(--accent)]">Автозапчасти без лишнего</span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Найдите нужную запчасть у проверенного продавца</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">Каталог новых и б/у автозапчастей. Сравнивайте предложения и связывайтесь с продавцом напрямую.</p>
              <form action="/catalog" className="mt-8 flex max-w-2xl rounded-2xl border border-gray-300 bg-white p-2 shadow-sm">
                <Search className="ml-3 self-center text-gray-400" size={21} />
                <input name="q" className="min-w-0 flex-1 px-3 py-3 outline-none" placeholder="Например, генератор Bosch или фара Camry" />
                <button className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800">Найти</button>
              </form>
              <div className="mt-6 flex flex-wrap gap-5 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={17} /> Модерация объявлений</span>
                <span className="inline-flex items-center gap-2"><Store size={17} /> Прямой контакт с продавцом</span>
              </div>
            </div>
            <div className="hidden rounded-3xl bg-gray-100 p-8 lg:block">
              <div className="rounded-2xl bg-white p-7 shadow-sm">
                <Wrench size={34} />
                <h2 className="mt-8 text-2xl font-bold">Каталог автозапчастей</h2>
                <p className="mt-2 text-gray-500">Запчасти, расходники и комплектующие в одном месте.</p>
                <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 p-4"><strong>1000+</strong><br /><span className="text-gray-500">объявлений</span></div>
                  <div className="rounded-xl bg-gray-50 p-4"><strong>24/7</strong><br /><span className="text-gray-500">доступ к каталогу</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">Категории</p><h2 className="mt-2 text-3xl font-black">Что ищете?</h2></div>
            <Link href="/catalog" className="hidden items-center gap-2 text-sm font-semibold md:flex">Весь каталог <ArrowRight size={17} /></Link>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link key={category.title} href={`/catalog?category=${encodeURIComponent(category.title)}`} className="rounded-2xl border border-[var(--line)] bg-white p-5 hover:border-gray-300 hover:shadow-sm">
                <h3 className="font-bold">{category.title}</h3><p className="mt-2 text-sm text-gray-500">{category.count} товаров</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--line)] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">Свежие предложения</p><h2 className="mt-2 text-3xl font-black">Новые товары</h2></div><Link href="/catalog" className="flex items-center gap-2 text-sm font-semibold">Смотреть все <ArrowRight size={17} /></Link></div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-10 text-sm text-gray-500 sm:flex-row sm:justify-between"><span>© 2026 AutoParts</span><span>Каталог · Помощь · Правила</span></footer>
    </>
  );
}
