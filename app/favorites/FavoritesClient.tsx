"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";

type FavoritePlaceholder = {
  id: number;
  price: number;
  addedOrder: number;
};

type SortOption = {
  value: "newest" | "price-asc" | "price-desc";
  label: string;
  emoji: string;
};

const sortOptions: SortOption[] = [
  { value: "newest", label: "Сначала новые", emoji: "🆕" },
  { value: "price-asc", label: "Сначала дешевле", emoji: "💸" },
  { value: "price-desc", label: "Сначала дороже", emoji: "💰" },
];

// Пустые тестовые карточки: цены и порядок нужны только для проверки сортировки.
const favoritePlaceholders: FavoritePlaceholder[] = [
  { id: 1, price: 89.9, addedOrder: 1 },
  { id: 2, price: 124.5, addedOrder: 2 },
  { id: 3, price: 42.9, addedOrder: 3 },
  { id: 4, price: 18.5, addedOrder: 4 },
  { id: 5, price: 156, addedOrder: 5 },
  { id: 6, price: 79.9, addedOrder: 6 },
];

export default function FavoritesClient() {
  const [sort, setSort] = useState<SortOption["value"]>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const visibleFavorites = useMemo(() => {
    const result = [...favoritePlaceholders];
    switch (sort) {
      case "price-asc":
        return result.sort((a, b) => a.price - b.price);
      case "price-desc":
        return result.sort((a, b) => b.price - a.price);
      case "newest":
      default:
        return result.sort((a, b) => b.addedOrder - a.addedOrder);
    }
  }, [sort]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-9">
      <nav aria-label="Хлебные крошки" className="mb-5 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/" className="transition hover:text-[var(--accent)]">Главная</Link>
        <span aria-hidden="true">·</span>
        <Link href="/favorites" aria-current="page" className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">Избранное</Link>
      </nav>

      <header className="mb-7 sm:mb-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">Ваш выбор</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Избранное</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          Сохранённые товары — всё нужное в одном месте.
        </p>
      </header>

      <section aria-label="Избранные товары" className="min-w-0">
        <div className="relative z-20 mb-5">
          <div className="flex min-h-10 items-center gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSortOpen((open) => !open)}
                aria-expanded={sortOpen}
                aria-haspopup="listbox"
                aria-label="Сортировка"
                title="Сортировка"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold transition hover:border-[var(--accent)]"
              >
                <ArrowDownWideNarrow size={17} className="text-[var(--accent)]" />
                <span className="hidden lg:inline">Сортировка</span>
                <ChevronDown size={14} className={`text-[var(--muted)] transition ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Закрыть меню сортировки"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setSortOpen(false)}
                  />
                  <div
                    role="listbox"
                    aria-label="Варианты сортировки"
                    className="absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[#11171c] p-1.5 shadow-2xl shadow-black/40"
                  >
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={sort === option.value}
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${sort === option.value ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)]" : "hover:bg-white/5"}`}
                      >
                        <span aria-hidden="true">{option.emoji}</span>
                        <span className="flex-1">{option.label}</span>
                        {sort === option.value && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1" aria-label="Вид отображения товаров">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-label="Показать сеткой"
                aria-pressed={view === "grid"}
                title="Сетка"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${view === "grid" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-label="Показать списком"
                aria-pressed={view === "list"}
                title="Список"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${view === "list" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>

          <p aria-live="polite" className="mt-3 text-left text-xs text-[var(--muted)] sm:text-sm">
            В избранном: <strong className="text-[var(--foreground)]">{visibleFavorites.length} товаров</strong>
          </p>
        </div>

        <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" : "flex flex-col gap-3"}>
          {visibleFavorites.map((favorite) => (
            <div
              key={favorite.id}
              aria-label="Пустая карточка избранного товара"
              className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]/40 ${view === "grid" ? "aspect-[4/5] min-h-36" : "h-28 w-full sm:h-36"}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
