"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
  X,
} from "lucide-react";

type Filters = {
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  discount: boolean;
  rating: string;
};

type ProductPlaceholder = {
  id: number;
  price: number;
  rating: number;
  inStock: boolean;
  discount: boolean;
};

const sortOptions = [
  { value: "popular", label: "По популярности", emoji: "⭐" },
  { value: "price-asc", label: "Сначала дешевле", emoji: "💸" },
  { value: "price-desc", label: "Сначала дороже", emoji: "💰" },
  { value: "rating", label: "По рейтингу", emoji: "🌟" },
  { value: "newest", label: "Сначала новинки", emoji: "🆕" },
];

// Temporary test directory. Remove these entries when the real vehicle directory is connected.
const vehicleMakes: string[] = [
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "Toyota",
  "Volkswagen",
];
const vehicleModelsByMake: Record<string, string[]> = {
  audi: ["A3", "A4", "A6", "Q3", "Q5"],
  bmw: ["1 Series", "3 Series", "5 Series", "X3", "X5"],
  "mercedes-benz": ["A-Class", "C-Class", "E-Class", "GLA", "GLC"],
  toyota: ["Corolla", "Camry", "RAV4", "Yaris", "Land Cruiser"],
  volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Touareg"],
};

// Temporary test records for exercising catalog filters. Remove when real products are connected.


// Placeholder records only keep the catalog layout visible until real products are connected.
const products: ProductPlaceholder[] = [
  { id: 1, price: 89.9, rating: 4.8, inStock: true, discount: true },
  { id: 2, price: 124.5, rating: 4.9, inStock: true, discount: false },
  { id: 3, price: 42.9, rating: 4.6, inStock: true, discount: true },
  { id: 4, price: 18.5, rating: 4.7, inStock: true, discount: false },
  { id: 5, price: 156, rating: 4.5, inStock: true, discount: false },
  { id: 6, price: 79.9, rating: 4.8, inStock: true, discount: true },
  { id: 7, price: 64.9, rating: 4.7, inStock: true, discount: false },
  { id: 8, price: 24.9, rating: 4.6, inStock: true, discount: true },
  { id: 9, price: 35, rating: 4.3, inStock: false, discount: false },
  { id: 10, price: 49.9, rating: 4.5, inStock: true, discount: false },
  { id: 11, price: 92.5, rating: 4.2, inStock: true, discount: true },
  { id: 12, price: 115, rating: 4.9, inStock: true, discount: false },
  { id: 13, price: 12.5, rating: 3.8, inStock: false, discount: true },
  { id: 14, price: 59.9, rating: 4.1, inStock: true, discount: false },
  { id: 15, price: 210, rating: 4.7, inStock: false, discount: false },
  { id: 16, price: 34.5, rating: 4.4, inStock: true, discount: true },
  { id: 17, price: 149.9, rating: 5.0, inStock: true, discount: false },
];


type VehicleComboboxProps = {
  label: string;
  value: string;
  placeholder: string;
  options?: string[];
  disabled?: boolean;
  searchable?: boolean;
  listMaxHeight?: "standard" | "ten-rows";
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
};

function VehicleCombobox({
  label,
  value,
  placeholder,
  options = [],
  disabled = false,
  searchable = true,
  listMaxHeight = "standard",
  onChange,
  onSelect,
}: VehicleComboboxProps) {
  const [open, setOpen] = useState(false);
  const normalizedQuery = value.trim().toLocaleLowerCase();
  const matches = searchable
    ? options.filter((option) => option.toLocaleLowerCase().includes(normalizedQuery))
    : options;

  return (
    <div className="relative block text-xs font-semibold text-[var(--muted)]">
      <label>
        {label}
        <input
          type="text"
          readOnly={!searchable}
          autoComplete="off"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-autocomplete={searchable ? "list" : "none"}
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onClick={() => { if (!searchable) setOpen(true); }}
          onChange={(event) => {
            if (!searchable) return;
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="mt-1.5 h-11 w-full rounded-lg border border-[var(--line)] bg-[#0b1014] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
        />
      </label>
      {open && !disabled && (
        <div
          role="listbox"
          aria-label={`${label}: варианты`}
          className={`absolute left-0 right-0 top-full z-50 mt-1 ${listMaxHeight === "ten-rows" ? "max-h-[25rem]" : "max-h-52"} overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-[#11171c] p-1.5 shadow-xl shadow-black/40`}
        >
          {matches.length > 0 ? (
            matches.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { onSelect(option); setOpen(false); }}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-[var(--foreground)] transition hover:bg-white/5"
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm font-normal text-[var(--muted)]" aria-live="polite">
              {searchable ? (normalizedQuery ? `${label} «${value.trim()}» не найдена` : `Введите ${label.toLocaleLowerCase()} для поиска`) : `Нет доступных вариантов`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const emptyFilters: Filters = {
  minPrice: "",
  maxPrice: "",
  inStock: false,
  discount: false,
  rating: "0",
};

export default function CatalogClient({
  initialCategory: _initialCategory,
  initialBrand: _initialBrand,
  initialQuery: _initialQuery,
}: {
  initialCategory: string;
  initialBrand: string;
  initialQuery: string;
}) {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [draft, setDraft] = useState<Filters>({ ...emptyFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [vehicleMake, setVehicleMake] = useState("");
  const [selectedVehicleMake, setSelectedVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [selectedVehicleModel, setSelectedVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");

  const visibleProducts = useMemo(() => {
    const result = products.filter((product) => {
      if (filters.minPrice !== "" && product.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice !== "" && product.price > Number(filters.maxPrice)) return false;
      if (filters.inStock && !product.inStock) return false;
      if (filters.discount && !product.discount) return false;
      if (filters.rating !== "0" && product.rating < Number(filters.rating)) return false;
      return true;
    });
    switch (sort) {
      case "price-asc": return result.sort((a, b) => a.price - b.price);
      case "price-desc": return result.sort((a, b) => b.price - a.price);
      case "rating": return result.sort((a, b) => b.rating - a.rating);
      case "newest": return result.sort((a, b) => b.id - a.id);
      default: return result.sort((a, b) => b.rating - a.rating || a.id - b.id);
    }
  }, [filters, sort]);

  const resetFilters = () => {
    setFilters({ ...emptyFilters });
    setDraft({ ...emptyFilters });
  };

  const openMobileFilters = () => {
    setDraft({ ...filters });
    setFilterOpen(true);
    setSortOpen(false);
  };

  const applyMobileFilters = () => {
    setFilters({ ...draft });
    setFilterOpen(false);
  };

  const activeFilters = [
    filters.inStock ? "В наличии" : "",
    filters.discount ? "Со скидкой" : "",
    filters.rating !== "0" ? `Рейтинг ${filters.rating}+` : "",
    filters.minPrice ? `от €${filters.minPrice}` : "",
    filters.maxPrice ? `до €${filters.maxPrice}` : "",
  ].filter(Boolean);

  const filterContents = (state: Filters, setState: (value: Filters) => void, mobile = false) => {
    const setValue = <K extends keyof Filters>(key: K, value: Filters[K]) => setState({ ...state, [key]: value });
    return (
      <>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <h2 className="text-base font-extrabold">Фильтры</h2>
          <button type="button" onClick={() => setState({ ...emptyFilters })} className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]">Сбросить всё</button>
        </div>
        <div className="border-b border-[var(--line)] py-4">
          <h3 className="mb-3 text-sm font-bold">Цена, €</h3>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Минимальная цена" type="number" min="0" value={state.minPrice} onChange={(e) => setValue("minPrice", e.target.value)} placeholder="От" className="h-10 min-w-0 rounded-lg border border-[var(--line)] bg-black/10 px-3 text-sm outline-none focus:border-[var(--accent)]" />
            <input aria-label="Максимальная цена" type="number" min="0" value={state.maxPrice} onChange={(e) => setValue("maxPrice", e.target.value)} placeholder="До" className="h-10 min-w-0 rounded-lg border border-[var(--line)] bg-black/10 px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
        </div>
        <div className="border-b border-[var(--line)] py-4">
          <h3 className="mb-3 text-sm font-bold">Наличие</h3>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm"><input type="checkbox" checked={state.inStock} onChange={(e) => setValue("inStock", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />Только в наличии</label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm"><input type="checkbox" checked={state.discount} onChange={(e) => setValue("discount", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />Только со скидкой</label>
          </div>
        </div>
        <div className="py-4">
          <h3 className="mb-3 text-sm font-bold">Рейтинг</h3>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm"><input type="radio" name={mobile ? "mobile-rating" : "desktop-rating"} checked={state.rating === "4.5"} onChange={() => setValue("rating", "4.5")} className="h-4 w-4 accent-[var(--accent)]" /><span className="text-amber-400">★★★★★</span><span className="text-[var(--muted)]">4.5+</span></label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm"><input type="radio" name={mobile ? "mobile-rating" : "desktop-rating"} checked={state.rating === "4"} onChange={() => setValue("rating", "4")} className="h-4 w-4 accent-[var(--accent)]" /><span className="text-amber-400">★★★★☆</span><span className="text-[var(--muted)]">4.0+</span></label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm"><input type="radio" name={mobile ? "mobile-rating" : "desktop-rating"} checked={state.rating === "0"} onChange={() => setValue("rating", "0")} className="h-4 w-4 accent-[var(--accent)]" />Любой рейтинг</label>
          </div>
        </div>
        <button type="button" onClick={mobile ? applyMobileFilters : () => { setFilters({ ...state }); setDraft({ ...state }); }} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--accent-hover)]"><Check size={17} />Показать товары</button>
      </>
    );
  };

  const countLabel = `${visibleProducts.length} ${visibleProducts.length === 1 ? "товар" : visibleProducts.length > 1 && visibleProducts.length < 5 ? "товара" : "товаров"}`;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-9">
      <nav aria-label="Хлебные крошки" className="mb-5 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/" className="transition hover:text-[var(--accent)]">Главная</Link>
        <span aria-hidden="true">·</span>
        <Link href="/catalog" aria-current="page" className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]">Каталог</Link>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Каталог автозапчастей</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)] sm:text-base">Подбирайте детали для своего автомобиля по параметрам и наличию.</p>
      </div>

      <section aria-labelledby="vehicleFinderTitle" className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="mb-4"><h2 id="vehicleFinderTitle" className="font-extrabold">Подбор по автомобилю</h2><p className="mt-1 text-sm text-[var(--muted)]">Укажите марку, модель и год выпуска автомобиля</p></div>
        <div className="grid grid-cols-1 gap-y-0 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-end lg:gap-3">
          <div className="mb-3 lg:mb-0">
            <VehicleCombobox
              label="Марка"
              value={vehicleMake}
              placeholder="Введите или найдите марку"
              options={vehicleMakes}
              onChange={(value) => {
                setVehicleMake(value);
                setSelectedVehicleMake("");
                setVehicleModel("");
                setSelectedVehicleModel("");
                setVehicleYear("");
              }}
              onSelect={(value) => {
                setVehicleMake(value);
                setSelectedVehicleMake(value);
                setVehicleModel("");
                setSelectedVehicleModel("");
                setVehicleYear("");
              }}
            />
          </div>
          {selectedVehicleMake && (
            <div className="mb-3 min-w-0 animate-in fade-in slide-in-from-top-1 duration-200 lg:mb-0">
              <VehicleCombobox
                label="Модель"
                value={vehicleModel}
                placeholder="Введите или найдите модель"
                options={vehicleModelsByMake[selectedVehicleMake.trim().toLocaleLowerCase()] ?? []}
                onChange={(value) => {
                  setVehicleModel(value);
                  setSelectedVehicleModel("");
                  setVehicleYear("");
                }}
                onSelect={(value) => {
                  setVehicleModel(value);
                  setSelectedVehicleModel(value);
                  setVehicleYear("");
                }}
              />
            </div>
          )}
          {selectedVehicleModel && (
            <div className="mb-3 min-w-0 animate-in fade-in slide-in-from-top-1 duration-200 lg:mb-0">
              <VehicleCombobox
                label="Год выпуска"
                value={vehicleYear}
                placeholder="Выберите год"
                options={Array.from({ length: 27 }, (_, index) => String(2026 - index))}
                searchable={false}
                listMaxHeight="ten-rows"
                onChange={() => setVehicleYear("")}
                onSelect={setVehicleYear}
              />
            </div>
          )}
          <button type="button" disabled={!selectedVehicleMake || !selectedVehicleModel || vehicleYear.length !== 4} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"><span>Подобрать</span></button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Фильтры каталога" className="hidden h-fit rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:block">{filterContents(filters, (value) => { setFilters(value); setDraft(value); })}</aside>

        <section aria-label="Товары каталога" className="min-w-0">
          <div className="relative z-20 mb-4">
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 sm:gap-3">
              <button type="button" onClick={() => { if (window.matchMedia("(min-width: 1024px)").matches) document.querySelector("[aria-label=\"Фильтры каталога\"]")?.scrollIntoView({ behavior: "smooth", block: "start" }); else openMobileFilters(); }} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold transition hover:border-[var(--accent)]" aria-label="Открыть фильтры" title="Фильтры"><SlidersHorizontal size={17} className="text-[var(--accent)]" /><span className="hidden lg:inline">Фильтры</span></button>
              <div className="relative shrink-0">
                <button type="button" onClick={() => setSortOpen((open) => !open)} aria-expanded={sortOpen} aria-label="Сортировка" title="Сортировка" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-bold transition hover:border-[var(--accent)]"><ArrowDownWideNarrow size={17} className="text-[var(--accent)]" /><span className="hidden lg:inline">Сортировка</span><ChevronDown size={14} className={`text-[var(--muted)] transition ${sortOpen ? "rotate-180" : ""}`} /></button>
                {sortOpen && <><button type="button" aria-label="Закрыть меню сортировки" className="fixed inset-0 z-30 cursor-default" onClick={() => setSortOpen(false)} /><div className="absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[#11171c] p-1.5 shadow-2xl shadow-black/40">{sortOptions.map((option) => <button key={option.value} type="button" onClick={() => { setSort(option.value); setSortOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${sort === option.value ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)]" : "hover:bg-white/5"}`}><span>{option.emoji}</span><span className="flex-1">{option.label}</span>{sort === option.value && <Check size={15} />}</button>)}</div></>}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1" aria-label="Вид отображения товаров">
                <button type="button" onClick={() => setView("grid")} aria-label="Показать сеткой" aria-pressed={view === "grid"} title="Сетка" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${view === "grid" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}><LayoutGrid size={17} /></button>
                <button type="button" onClick={() => setView("list")} aria-label="Показать списком" aria-pressed={view === "list"} title="Список" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${view === "list" ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}><ListIcon size={18} /></button>
              </div>
            </div>
            <p aria-live="polite" className="mt-4 text-left text-xs text-[var(--muted)] sm:text-sm">Найдено: <strong className="text-[var(--foreground)]">{countLabel}</strong></p>
          </div>

          {activeFilters.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2">{activeFilters.map((filter) => <span key={filter} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--muted)]">{filter}<button type="button" onClick={() => setFilters({ ...filters, inStock: filter === "В наличии" ? false : filters.inStock, discount: filter === "Со скидкой" ? false : filters.discount, rating: filter.startsWith("Рейтинг") ? "0" : filters.rating, minPrice: filter.startsWith("от €") ? "" : filters.minPrice, maxPrice: filter.startsWith("до €") ? "" : filters.maxPrice })} aria-label={`Убрать фильтр ${filter}`} className="hover:text-[var(--accent)]"><X size={12} /></button></span>)}<button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"><RotateCcw size={12} />Сбросить</button></div>}

          {visibleProducts.length ? <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" : "flex flex-col gap-3"}>{visibleProducts.map((product) => <div key={product.id} aria-label="Пустая карточка товара" className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]/40 ${view === "grid" ? "aspect-[4/5] min-h-36" : "h-28 w-full sm:h-36"}`} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-16 text-center"><Filter size={28} className="mx-auto text-[var(--muted)]" /><h2 className="mt-4 text-lg font-bold">Ничего не найдено</h2><p className="mt-2 text-sm text-[var(--muted)]">Попробуйте изменить параметры фильтрации.</p><button type="button" onClick={resetFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)]"><RotateCcw size={15} />Сбросить фильтры</button></div>}
        </section>
      </div>

      {filterOpen && <div className="fixed inset-0 z-[70] lg:hidden"><button type="button" aria-label="Закрыть фильтры" onClick={() => setFilterOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" /><aside aria-label="Мобильные фильтры" className="absolute inset-y-0 left-0 flex w-[min(88vw,380px)] flex-col border-r border-[var(--line)] bg-[var(--background)] shadow-2xl"><div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4"><span className="text-lg font-black">Фильтры</span><button type="button" onClick={() => setFilterOpen(false)} aria-label="Закрыть фильтры" className="rounded-lg p-2 hover:bg-white/10"><X size={20} /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">{filterContents(draft, setDraft, true)}</div></aside></div>}
    </main>
  );
}
