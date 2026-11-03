"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Heart, House, LayoutGrid, Search, UserRound, LogOut, Settings, ShoppingCart, CarFront, ShieldCheck, ClipboardList, Shield } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import { authClient } from "@/lib/auth-client";

const slogan = "Найдите деталь. Двигайтесь дальше.";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileStaffOpen, setMobileStaffOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileStaffRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ favorites: 0, cart: 0, messages: 0, notifications: 0 });

  const storageScope = sessionPending ? null : (session?.user?.id ?? "guest");
  const readCounts = () => {
    if (storageScope === null) return;
    try {
      const favorites = JSON.parse(window.localStorage.getItem(`axion_favorites:${storageScope}`) || "[]") as unknown;
      const cart = JSON.parse(window.localStorage.getItem(`axion_cart:${storageScope}`) || "[]") as unknown;

      setCounts(current => ({
        favorites: Array.isArray(favorites) ? favorites.length : 0,
        cart: Array.isArray(cart) ? cart.length : 0,
        messages: current.messages,
        notifications: current.notifications,
      }));
    } catch {
      setCounts(current => ({ ...current, favorites: 0, cart: 0 }));
    }
  };

  const badge = (count: number) => count > 0 ? <span className="absolute -right-1 -top-1 grid min-h-[17px] min-w-[17px] place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-black leading-none text-white ring-2 ring-[var(--header)]">{count > 99 ? "99+" : count}</span> : null;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchLabel, setMobileSearchLabel] = useState("");

  useEffect(() => {
    const syncFromLocation = () => {
      setMobileSearchLabel(pathname === "/catalog" ? new URLSearchParams(window.location.search).get("q") ?? "" : "");
    };
    const handleSearchQueryChanged = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") setMobileSearchLabel(event.detail);
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("axion:search-query-changed", handleSearchQueryChanged);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("axion:search-query-changed", handleSearchQueryChanged);
    };
  }, [pathname]);

  useEffect(() => {
    queueMicrotask(readCounts);
    window.addEventListener("storage", readCounts);
    window.addEventListener("axion:cart-updated", readCounts);
    window.addEventListener("axion:favorites-updated", readCounts);
    let active = true;
    const refreshMessageCount = async () => {
      try {
        const response = await fetch("/api/chat/unread", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { count?: number };
        if (active && typeof data.count === "number") setCounts(current => ({ ...current, messages: data.count ?? 0 }));
      } catch { /* Retry on the next refresh. */ }
    };
    const refreshNotificationCount = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { unreadCount?: number };
        if (active && typeof result.unreadCount === "number") setCounts((current) => ({ ...current, notifications: result.unreadCount ?? 0 }));
      } catch { /* Keep the last known count when temporarily offline. */ }
    };
    window.addEventListener("axion:unread-updated", refreshMessageCount);
    window.addEventListener("axion:notifications-updated", refreshNotificationCount);
    window.addEventListener("focus", refreshMessageCount);
    window.addEventListener("focus", refreshNotificationCount);
    void refreshNotificationCount(); void refreshMessageCount();
    const notificationTimer = window.setInterval(() => { void refreshNotificationCount(); void refreshMessageCount(); }, 5000);
    return () => {
      active = false;
      window.clearInterval(notificationTimer);
      window.removeEventListener("storage", readCounts);
      window.removeEventListener("axion:cart-updated", readCounts);
      window.removeEventListener("axion:favorites-updated", readCounts);
      window.removeEventListener("axion:unread-updated", refreshMessageCount);
      window.removeEventListener("axion:notifications-updated", refreshNotificationCount);
      window.removeEventListener("focus", refreshMessageCount);
      window.removeEventListener("focus", refreshNotificationCount);
    };
  }, [storageScope]);


  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!mobileStaffOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileStaffRef.current?.contains(event.target)) {
        setMobileStaffOpen(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileStaffOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [mobileStaffOpen]);

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

            <div className="hidden min-w-0 flex-1 md:block">
<Suspense fallback={<div className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)]" />}>
                <SearchBox storageScope={storageScope ?? "guest"} />
              </Suspense>
            </div>

            <div className="min-w-0 flex-1 md:hidden">
              <button
                type="button"
                aria-label="Открыть поиск"
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen(true)}
                className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 text-left text-sm text-[var(--muted)] transition-colors hover:border-[var(--line)]"
              >
                <span className="min-w-0 flex-1 truncate">{mobileSearchLabel || "Поиск автозапчастей..."}</span>
                <Search size={18} className="shrink-0 text-[var(--accent)]" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link href="/favorites" aria-label={`Избранное${counts.favorites ? `: ${counts.favorites}` : ""}`} title="Избранное" className="relative hidden rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[var(--accent)] md:inline-flex"><Heart size={21} />{badge(counts.favorites)}</Link>
              <Link href="/cart" aria-label={`Заказ${counts.cart ? `: ${counts.cart}` : ""}`} title="Заказ" className="relative hidden rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[var(--accent)] md:inline-flex"><ShoppingCart size={21} />{badge(counts.cart)}</Link>
              <Link href="/chat" aria-label={`Чат${counts.messages ? `: ${counts.messages} непрочитанных` : ""}`} title="Чат" className="relative inline-flex h-10 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/10 sm:w-10"><span aria-hidden="true">💬</span>{badge(counts.messages)}</Link>
              <Link href="/notifications" aria-label={`Уведомления${counts.notifications ? `: ${counts.notifications} непрочитанных` : ""}`} title="Уведомления" className="relative inline-flex h-10 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/10 sm:w-10"><span aria-hidden="true">🔔</span>{badge(counts.notifications)}</Link>
              {session?.user ? (
                <div ref={accountMenuRef} className="relative hidden md:block">
                  <button type="button" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((open) => !open)} className="inline-flex max-w-44 items-center gap-2 truncate rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-[var(--accent)]">
                    <UserRound size={17} className="shrink-0" />
                    <span className="truncate">{accountLabel}</span>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-xl">
                      <div className="border-b border-[var(--line)] px-3 py-2"><p className="truncate text-sm font-semibold text-[var(--foreground)]">{fullName || accountLabel}</p><p className="truncate text-xs text-[var(--muted)]">{session.user.email}</p></div>
                      <Link href="/" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"><House size={16} />Главная</Link>
                      <Link href="/catalog" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"><CarFront size={16} />Каталог</Link>
                      {session.user.role === "ADMIN" && <Link href="/admin" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-white/5"><LayoutGrid size={16} />Панель администрации</Link>}
                      {(session.user.role === "MODERATOR" || session.user.role === "ADMIN") && <Link href="/moderator" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"><ShieldCheck size={16} />Панель модерации</Link>}
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
              <Suspense fallback={null}>
                <SearchBox
                  storageScope={storageScope ?? "guest"}
                  mobile
                  mobileOpen={mobileSearchOpen}
                  onMobileClose={() => setMobileSearchOpen(false)}
                />
              </Suspense>
            </div>
          )}
        </div>
      </header>

      <nav aria-label="Мобильная навигация" className={`fixed inset-x-0 bottom-0 z-40 grid ${session?.user?.role === "ADMIN" ? "grid-cols-6" : "grid-cols-5"} border-t border-[var(--line)] bg-[var(--header)]/95 pb-[env(safe-area-inset-bottom)] pt-1 text-white shadow-[0_-8px_24px_rgba(0,0,0,0.25)] backdrop-blur md:hidden`}>
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${pathname === "/" ? "text-[var(--accent)]" : "text-white/80"}`}><House size={20} /><span>Главная</span></Link>
        <Link href="/catalog" aria-current={isActive("/catalog") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/catalog") ? "text-[var(--accent)]" : "text-white/80"}`}><LayoutGrid size={20} /><span>Каталог</span></Link>
        <Link href="/favorites" aria-current={isActive("/favorites") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/favorites") ? "text-[var(--accent)]" : "text-white/80"}`}><span className="relative"><Heart size={20} />{badge(counts.favorites)}</span><span>Избранное</span></Link>
        <Link href="/cart" aria-current={isActive("/cart") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/cart") ? "text-[var(--accent)]" : "text-white/80"}`}><span className="relative"><ShoppingCart size={20} />{badge(counts.cart)}</span><span>Заказ</span></Link>
        {session?.user ? (
          <>
            {session.user.role === "ADMIN" && (
              <div ref={mobileStaffRef} className="relative flex min-w-0 items-center justify-center">
                <button
                  type="button"
                  aria-expanded={mobileStaffOpen}
                  aria-haspopup="menu"
                  aria-controls="mobile-staff-menu"
                  aria-label="Панели управления"
                  onClick={() => setMobileStaffOpen(open => !open)}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 text-xs ${isActive("/admin") || isActive("/moderator") ? "text-[var(--accent)]" : "text-white/80"}`}
                  style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 400, color: isActive("/admin") || isActive("/moderator") ? "var(--accent)" : "rgba(255,255,255,0.8)" }}
                >
                  <ShieldCheck size={20} />
                  <span>Панели</span>
                </button>
                {mobileStaffOpen && (
                  <div id="mobile-staff-menu" role="menu" aria-label="Панели управления" className="absolute bottom-full right-0 z-50 mb-2 flex w-max max-w-[calc(100vw-16px)] flex-col gap-1 rounded-xl border border-[var(--line)] bg-[var(--header)] p-2 text-white shadow-xl">
                    <Link role="menuitem" href="/admin" onClick={() => setMobileStaffOpen(false)} className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/10">
                      <Shield size={18} className="shrink-0" />
                      <span>Админ</span>
                    </Link>
                    <Link role="menuitem" href="/moderator" onClick={() => setMobileStaffOpen(false)} className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/10">
                      <ClipboardList size={18} className="shrink-0" />
                      <span>Модератор</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
            <Link href="/profile/settings" aria-label={`Профиль: ${accountLabel}`} className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs text-white/80 hover:text-[var(--accent)]"><UserRound size={20} /><span className="max-w-full truncate">{accountLabel}</span></Link>
          </>
        ) : (
          <Link href="/login" aria-current={isActive("/login") ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${isActive("/login") ? "text-[var(--accent)]" : "text-white/80"}`}><UserRound size={20} /><span>{sessionPending ? "Аккаунт…" : "Войти"}</span></Link>
        )}
      </nav>
    </>
  );
}
