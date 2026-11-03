"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListingCard, type PublicListing } from "@/components/cards/ListingCard";
import { ArrowDownWideNarrow, Check, ChevronDown, LayoutGrid, List as ListIcon } from "lucide-react";

const sortOptions = [
  { value: "newest", label: "Сначала новые", emoji: "🆕" },
  { value: "price-asc", label: "Сначала дешевле", emoji: "💸" },
  { value: "price-desc", label: "Сначала дороже", emoji: "💰" },
] as const;

export default function SellerProfileClient({ listings }: { listings: PublicListing[] }) {
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const sortedListings = useMemo(() => {
    const result = [...listings];
    if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
    return result;
  }, [listings, sort]);

  return <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-9">
    <nav aria-label="Хлебные крошки" className="mb-5 flex items-center gap-2 text-sm text-[var(--muted)]">
      <Link href="/" className="transition hover:text-[var(--accent)]">Главная</Link><span aria-hidden="true">·</span><Link href="/chat" className="transition hover:text-[var(--accent)]">Сообщения</Link><span aria-hidden="true">·</span><span className="font-semibold text-[var(--foreground)]">Профиль продавца</span>
    </nav>
    <header className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">Объявления</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Профиль продавца</h1><p className="mt-3 text-sm text-[var(--muted)]">Все опубликованные объявления.</p></header>
    <section aria-label="Объявления продавца">
      <div className="relative z-20 mb-5"><div className="flex min-h-10 items-center gap-3">
        <div className="relative shrink-0"><button type="button" onClick={() => setSortOpen((open) => !open)} aria-expanded={sortOpen} aria-haspopup="listbox" aria-label="Сортировка" title="Сортировка" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold transition hover:border-[var(--accent)]"><ArrowDownWideNarrow size={17} className="text-[var(--accent)]"/><span className="hidden lg:inline">Сортировка</span><ChevronDown size={14} className={sortOpen ? "rotate-180 text-[var(--muted)]" : "text-[var(--muted)]"}/></button>
          {sortOpen && <><button type="button" aria-label="Закрыть меню сортировки" className="fixed inset-0 z-30 cursor-default" onClick={() => setSortOpen(false)}/><div role="listbox" aria-label="Варианты сортировки" className="absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[#11171c] p-1.5 shadow-2xl shadow-black/40">{sortOptions.map((option) => <button key={option.value} type="button" role="option" aria-selected={sort === option.value} onClick={() => { setSort(option.value); setSortOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition \${sort === option.value ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)]" : "hover:bg-white/5"}`}><span>{option.emoji}</span><span className="flex-1">{option.label}</span>{sort === option.value && <Check size={15}/>}</button>)}</div></>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1" aria-label="Вид отображения товаров"><button type="button" onClick={() => setView("grid")} aria-label="Показать сеткой" aria-pressed={view === "grid"} title="Сетка" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg \${view === "grid" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)]"}`}><LayoutGrid size={17}/></button><button type="button" onClick={() => setView("list")} aria-label="Показать списком" aria-pressed={view === "list"} title="Список" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg \${view === "list" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)]"}`}><ListIcon size={18}/></button></div>
      </div><p className="mt-3 text-xs text-[var(--muted)] sm:text-sm">Объявлений: <strong className="text-[var(--foreground)]">{sortedListings.length}</strong></p></div>
      {sortedListings.length ? <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" : "flex flex-col gap-3"}>{sortedListings.map((listing) => <ListingCard key={listing.id} listing={listing} view={view}/>)}</div> : <div className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">Опубликованных объявлений пока нет.</div>}
    </section>
  </main>;
}
