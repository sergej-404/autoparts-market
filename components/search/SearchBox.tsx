"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock3, Search, X, Folder, Image as ImageIcon } from "lucide-react";

type SearchCategory = { id: string; name: string };
type SearchListing = { id: string; title: string; price: number; image: string | null; category: string };
type Suggestions = { categories: SearchCategory[]; listings: SearchListing[] };
type SearchBoxProps = { storageScope: string; mobile?: boolean; mobileOpen?: boolean; onMobileClose?: () => void };

const HISTORY_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;
const EMPTY_SUGGESTIONS: Suggestions = { categories: [], listings: [] };

function historyKey(scope: string): string {
  return `axion_search_history:${scope}`;
}

function readHistory(scope: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(historyKey(scope)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function notifySearchQueryChanged(query: string): void {
  window.dispatchEvent(new CustomEvent<string>("axion:search-query-changed", { detail: query }));
}

function saveHistory(scope: string, query: string): void {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!normalized) return;
  const next = [normalized, ...readHistory(scope).filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase())].slice(0, HISTORY_LIMIT);
  try {
    window.localStorage.setItem(historyKey(scope), JSON.stringify(next));
  } catch {
    // Search navigation must remain available when browser storage is disabled.
  }
}

export default function SearchBox(props: SearchBoxProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeQuery = pathname === "/catalog" ? searchParams.get("q") ?? "" : "";
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    if (props.mobile && pathname !== "/catalog") props.onMobileClose?.();
  }, [pathname, props.mobile, props.onMobileClose]);

  // A route/query change creates a fresh search instance. This avoids copying
  // router state into local state from an effect and keeps browser Back/Forward in sync.
  return (
    <SearchBoxContent
      key={`${pathname}?${routeQuery}`}
      {...props}
      initialQuery={routeQuery}
    />
  );
}

function SearchBoxContent({
  storageScope,
  mobile = false,
  mobileOpen = false,
  onMobileClose,
  initialQuery,
}: SearchBoxProps & { initialQuery: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onMobileCloseRef = useRef(onMobileClose);
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState(false);

  const close = useCallback(() => {
    setFocused(false);
    if (mobile) onMobileClose?.();
  }, [mobile, onMobileClose]);

  useEffect(() => {
    onMobileCloseRef.current = onMobileClose;
  }, [onMobileClose]);

  // Focus is a DOM synchronization; the input's onFocus handler owns React state.
  useEffect(() => {
    if (!mobile || !mobileOpen) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [mobile, mobileOpen]);

  useEffect(() => {
    if (!focused) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close();
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [focused, close]);

  useEffect(() => {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (!focused || normalized.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setRequestError(false);
      setSuggestions(EMPTY_SUGGESTIONS);

      void (async () => {
        try {
          const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(normalized)}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Search suggestions request failed");
          const result = await response.json() as Suggestions;
          setSuggestions({
            categories: Array.isArray(result.categories) ? result.categories : [],
            listings: Array.isArray(result.listings) ? result.listings : [],
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          setRequestError(true);
          setSuggestions(EMPTY_SUGGESTIONS);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, focused]);

  const submit = (value = query) => {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) {
      inputRef.current?.focus();
      return;
    }
    saveHistory(storageScope, normalized);
    setHistory(readHistory(storageScope));
    setQuery(normalized);
    notifySearchQueryChanged(normalized);
    close();
    router.push(`/catalog?q=${encodeURIComponent(normalized)}`);
  };

  const selectCategory = (category: SearchCategory) => {
    close();
    setQuery("");
    notifySearchQueryChanged("");
    router.push(`/catalog?category=${encodeURIComponent(category.name)}`);
  };

  const selectListing = (listing: SearchListing) => {
    saveHistory(storageScope, query);
    notifySearchQueryChanged("");
    close();
    router.push(`/product/${encodeURIComponent(listing.id)}`);
  };

  const clearHistoryItem = (item: string) => {
    const next = history.filter((entry) => entry !== item);
    try {
      window.localStorage.setItem(historyKey(storageScope), JSON.stringify(next));
      setHistory(next);
    } catch {
      setHistory(next);
    }
  };

  const clearHistory = () => {
    try {
      window.localStorage.removeItem(historyKey(storageScope));
    } catch {
      // Keep the current UI usable when browser storage is unavailable.
    }
    setHistory([]);
  };

  const queryLength = query.trim().length;
  const showHistory = focused && queryLength === 0;
  const showMinimumHint = focused && queryLength > 0 && queryLength < MIN_QUERY_LENGTH;
  const showSuggestions = focused && queryLength >= MIN_QUERY_LENGTH;
  const dropdownVisible = showHistory || showMinimumHint || showSuggestions;

  if (mobile && !mobileOpen) return null;

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <style jsx global>{`
        .axion-search-input::-webkit-search-cancel-button,
        .axion-search-input::-webkit-search-decoration {
          -webkit-appearance: none;
          appearance: none;
          display: none;
        }
      `}</style>
      <form
        role="search"
        onSubmit={(event) => { event.preventDefault(); submit(); }}
        className={`flex h-10 w-full min-w-0 items-center overflow-hidden rounded-lg border bg-[var(--surface)] transition-colors focus-within:border-[var(--accent)] ${mobile ? "border-[var(--accent)]" : "border-[var(--line)]"}`}
      >
        {mobile && (
          <button type="button" aria-label="Закрыть поиск" onClick={close} className="flex h-full w-10 shrink-0 items-center justify-center text-[var(--accent)]">
            <ArrowLeft size={19} />
          </button>
        )}
        <input
          ref={inputRef}
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Поиск автозапчастей"
          aria-controls="axion-search-dropdown"
          placeholder={mobile ? "Поиск автозапчастей..." : "Поиск по каталогу, артикулу или категории..."}
          value={query}
          onFocus={() => { setFocused(true); setHistory(readHistory(storageScope)); }}
          onChange={(event) => { setQuery(event.target.value); notifySearchQueryChanged(event.target.value); }}
          className={`axion-search-input h-full min-w-0 flex-1 appearance-none bg-transparent px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] ${mobile ? "text-base" : ""}`}
        />
        {query && (
          <button type="button" aria-label="Очистить поиск" onClick={() => { setQuery(""); notifySearchQueryChanged(""); setHistory(readHistory(storageScope)); inputRef.current?.focus(); }} className="flex h-full w-9 shrink-0 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]">
            <X size={16} />
          </button>
        )}
        <button type="submit" aria-label="Найти" className="flex h-full w-11 shrink-0 items-center justify-center bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)]">
          <Search size={19} />
        </button>
      </form>

      {dropdownVisible && (
        <div id="axion-search-dropdown" className={`absolute left-0 right-0 top-full z-[70] mt-2 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-2xl shadow-black/40 ${mobile ? "max-h-[calc(100dvh-100px)]" : ""}`}>
          {showHistory && (
            <>
              <div className="flex items-center justify-between px-2 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Недавние запросы</p>
                {history.length > 0 && <button type="button" onClick={clearHistory} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent)]">Очистить</button>}
              </div>
              {history.length > 0 ? history.map((item) => (
                <div key={item} className="group flex items-center gap-2 rounded-lg hover:bg-white/5">
                  <button type="button" onClick={() => submit(item)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left">
                    <Clock3 size={19} className="shrink-0 text-[var(--muted)]" />
                    <span className="min-w-0 flex-1 truncate text-sm">{item}<span className="block text-xs text-[var(--muted)]">История</span></span>
                  </button>
                  <button type="button" aria-label={`Удалить запрос ${item} из истории`} onClick={() => clearHistoryItem(item)} className="mr-2 rounded p-1 text-[var(--muted)] opacity-70 hover:text-[var(--accent)]"><X size={15} /></button>
                </div>
              )) : <p className="px-2 py-3 text-sm text-[var(--muted)]">История поиска пока пуста</p>}
            </>
          )}

          {showMinimumHint && <p className="px-2 py-3 text-sm text-[var(--muted)]">Введите ещё минимум {MIN_QUERY_LENGTH - queryLength} символ</p>}

          {showSuggestions && (
            <>
              {loading && <p className="px-2 py-3 text-sm text-[var(--muted)]">Ищем подходящие варианты…</p>}
              {requestError && <p className="px-2 py-3 text-sm text-[var(--muted)]">Не удалось загрузить подсказки. Попробуйте ещё раз.</p>}
              {!loading && !requestError && suggestions.categories.length === 0 && suggestions.listings.length === 0 && <p className="px-2 py-3 text-sm text-[var(--muted)]">Совпадений не найдено</p>}
              {suggestions.categories.length > 0 && (
                <section>
                  <p className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Категории</p>
                  {suggestions.categories.map((category) => (
                    <button key={category.id} type="button" onClick={() => selectCategory(category)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition hover:bg-white/5">
                      <Folder size={18} className="shrink-0 text-[var(--accent)]" />
                      <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    </button>
                  ))}
                </section>
              )}
              {suggestions.listings.length > 0 && (
                <section className={suggestions.categories.length > 0 ? "mt-2 border-t border-[var(--line)] pt-1" : ""}>
                  <p className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Объявления</p>
                  {suggestions.listings.map((listing) => (
                    <button key={listing.id} type="button" onClick={() => selectListing(listing)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5">
                      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/10">
                        {listing.image ? <img src={listing.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={18} className="text-[var(--muted)]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{listing.title}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">{listing.category} · Артикул: {listing.id}</span>
                      </span>
                      <span className="shrink-0 text-xs font-bold">{new Intl.NumberFormat("ru-RU").format(listing.price)} RUB</span>
                    </button>
                  ))}
                </section>
              )}
              {!loading && !requestError && (suggestions.categories.length > 0 || suggestions.listings.length > 0) && (
                <button type="button" onClick={() => submit()} className="mt-2 w-full border-t border-[var(--line)] px-2 py-3 text-left text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  Все результаты по запросу «{query.trim()}» →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
