"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, House, LayoutGrid, Search, UserRound, LogOut, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const slogan = "Найдите деталь. Двигайтесь дальше.";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInput = useRef<HTMLInputElement>(null);
  const desktopSearchInput = useRef<HTMLInputElement>(null);
  const mobileSearchForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchInput.current?.focus({ preventScroll: true });
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const desktopForm = document.querySelector('[data-search-form="desktop"]');
      const clickedDesktopSearch = desktopForm?.contains(target) ?? false;
      const clickedMobileSearch = mobileSearchForm.current?.contains(target) ?? false;

      if (!clickedDesktopSearch) {
        desktopSearchInput.current?.blur();
      }

      if (mobileSearchOpen && !clickedMobileSearch) {
        mobileSearchInput.current?.blur();
        setMobileSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [mobileSearchOpen]);

  const fullName = session?.user?.name?.trim() ?? "";
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const accountLabel = nameParts.length > 1
    ? `${nameParts[0]} ${Array.from(nameParts[1])[0].toLocaleUpperCase("ru-RU")}.`
    : nameParts[0] || "Мой аккаунт";

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  if (pathname === "/login" || pathname === "/register") return null;

  const navClass = (href: string) =>
    `rounded-md px-2 py-2 text-sm font-semibold transition ${
      isActive(href) ? "text-[var(--accent)]" : "text-white hover:text-[var(--accent)]"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--line)] bg-[var(--header)] text-white shadow-lg shadow-black/20">
        <div className="relative mx-auto max-w-[1600px] px-3 sm:px-5">
          <div className="flex min-h-[64px] items-center gap-2 py-2 md:gap-5">
            <Link href="/" aria-label="AXION X — главная" className="flex shrink-0 items-center">
              <img
                src="/brand/Menu_1_cloy_pc.png"
                alt="AXION X"
                className="hidden h-12 w-36 object-contain md:block"
              />
              <img
                src="/brand/Graphics.png"
                alt="AXION X"
                className="h-10 w-10 object-contain md:hidden"
              />
            </Link>

            <nav aria-label="Основная навигация" className="hidden shrink-0 items-center gap-2 md:flex">
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={navClass("/")}>Главная</Link>
              <Link href="/catalog" aria-current={isActive("/catalog") ? "page" : undefined} className={navClass("/catalog")}>Каталог</Link>
            </nav>

            <div className="hidden min-w-0 flex-1 md:block">
              <form data-search-form="desktop" action="/catalog" role="search" className="flex h-10 w-full min-w-0 items-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] transition-colors focus-within:border-[var(--accent)]">
                <input ref={desktopSearchInput} name="q" type="search" aria-label="Поиск автозапчастей" placeholder="Поиск по каталогу, артикулу или категории..." className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
                <button type="submit" aria-label="Найти" className="flex h-full w-11 shrink-0 items-center justify-center bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)]"><Search size={19} /></button>
              </form>
            </div>

            <div className="min-w-0 flex-1 md:hidden">
              <button
                type="button"
                aria-label="Открыть поиск"
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen(true)}
                className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 text-left text-sm text-[var(--muted)] transition-colors hover:border-[var(--line)]"
              >
                <span className="min-w-0 flex-1 truncate">Поиск автозапчастей...</span>
                <Search size={18} className="shrink-0 text-[var(--accent)]" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link href="/favorites" aria-label="Избранное" title="Избранное" className="hidden rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[var(--accent)] md:inline-flex"><Heart size={21} /></Link>
              <Link href="/chat" aria-label="Чат" title="Чат" className="inline-flex h-10 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/10 sm:w-10"><span aria-hidden="true">💬</span></Link>
              <Link href="/notifications" aria-label="Уведомления" title="Уведомления" className="inline-flex h-10 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/10 sm:w-10"><span aria-hidden="true">🔔</span></Link>
              {session?.user ? (
                <div className="relative hidden md:block">
                  <button type="button" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((open) => !open)} className="inline-flex max-w-44 items-center gap-2 truncate rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-[var(--accent)]">
                    <UserRound size={17} className="shrink-0" />
                    <span className="truncate">{accountLabel}</span>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-xl">
                      <div className="border-b border-[var(--line)] px-3 py-2"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{fullName || accountLabel}</p><p className="truncate text-xs text-[var(--muted)]">{session.user.email}</p></div>
                      <Link href="/profile/settings" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"><Settings size={16} />Профиль и настройки</Link>
                      <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-white/5"><LogOut size={16} />Выйти</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" aria-label="Войти или зарегистрироваться" className="hidden max-w-36 truncate rounded-lg px-2 py-2 text-sm font-semibold text-white transition hover:bg-white/10 md:inline-flex">{sessionPending ? "Аккаунт…" : "Войти"}</Link>
              )}
            </div>
          </div>

          <div className="mb-2 flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] px-3 py-2 text-center">
            <p className="text-sm font-medium tracking-wide text-white sm:text-base">{slogan}</p>
          </div>

          {mobileSearchOpen && (
            <div className="absolute inset-x-0 top-2 z-[60] px-3 md:hidden">
              <form
                ref={mobileSearchForm}
                action="/catalog"
                role="search"
                className="flex h-10 w-full min-w-0 overflow-hidden rounded-lg border border-[var(--accent)] bg-[var(--surface)]"
                onSubmit={() => setMobileSearchOpen(false)}
              >
                <button
                  type="button"
                  aria-label="Закрыть поиск"
                  onClick={() => {
                    mobileSearchInput.current?.blur();
                    setMobileSearchOpen(false);
                  }}
                  className="flex h-full w-10 shrink-0 items-center justify-center text-[var(--accent)]"
                >
                  <ArrowLeft size={20} />
                </button>
                <input
                  ref={mobileSearchInput}
                  name="q"
                  type="search"
                  aria-label="Поиск автозапчастей"
                  placeholder="Поиск автозапчастей..."
                  className="h-full min-w-0 flex-1 appearance-none bg-transparent px-3 text-base text-[var(--foreground)] outline-none ring-0 placeholder:text-[var(--muted)] focus:outline-none focus:ring-0"
                />
                <button type="submit" aria-label="Найти" className="flex h-full w-11 shrink-0 items-center justify-center bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)]"><Search size={19} /></button>
              </form>
            </div>
          )}
        </div>
      </header>

      <nav aria-label="Мобильная навигация" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--line)] bg-[var(--header)]/95 pb-[env(safe-area-inset-bottom)] pt-1 text-white shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${pathname === "/" ? "text-[var(--accent)]" : "text-white/80"}`}><House size={20} /><span>Главная</span></Link>
        <Link href="/catalog" aria-current={isActive("/catalog") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/catalog") ? "text-[var(--accent)]" : "text-white/80"}`}><LayoutGrid size={20} /><span>Каталог</span></Link>
        <Link href="/favorites" aria-current={isActive("/favorites") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/favorites") ? "text-[var(--accent)]" : "text-white/80"}`}><Heart size={20} /><span>Избранное</span></Link>
        {session?.user ? (
          <Link href="/profile/settings" aria-label={`Профиль: ${accountLabel}`} className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs text-white/80 hover:text-[var(--accent)]"><UserRound size={20} /><span className="max-w-full truncate">{accountLabel}</span></Link>
        ) : (
          <Link href="/login" aria-current={isActive("/login") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/login") ? "text-[var(--accent)]" : "text-white/80"}`}><UserRound size={20} /><span>{sessionPending ? "Аккаунт…" : "Войти"}</span></Link>
        )}
      </nav>
    </>
  );
}
