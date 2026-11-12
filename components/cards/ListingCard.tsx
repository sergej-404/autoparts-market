"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Heart, ImageOff, ShoppingCart } from "lucide-react";

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  images: string[];
  year: number | null;
  price: number;
  quantity: number;
  status: "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK";
  make: { name: string } | null;
  model: { name: string } | null;
  category: { name: string };
};

type CartItem = { id: string; title: string; price: number; quantity: number };

export function ListingCard({ listing, view = "grid", compact = false }: { listing: PublicListing; view?: "grid" | "list"; compact?: boolean }) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const storageScope = sessionPending ? null : (session?.user?.id ?? null);
  const cartKey = storageScope === null ? null : `axion_cart:${storageScope}`;
  const favoritesKey = storageScope === null ? null : `axion_favorites:${storageScope}`;
  const [favorite, setFavorite] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const vehicle = [listing.make?.name, listing.model?.name, listing.year?.toString()].filter(Boolean).join(" · ");
  const unavailable = listing.status === "OUT_OF_STOCK" || listing.quantity <= 0;

  useEffect(() => {
    if (!cartKey || !favoritesKey) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
      const favorites = JSON.parse(window.localStorage.getItem(favoritesKey!) || "[]") as string[];
      const cart = JSON.parse(window.localStorage.getItem(cartKey!) || "[]") as CartItem[];
      setFavorite(favorites.includes(listing.id));
      setInCart(cart.some((item) => item.id === listing.id));
    } catch {
      setFavorite(false);
      setInCart(false);
      }
    });
    return () => { active = false; };
  }, [listing.id, cartKey, favoritesKey]);

  const requireSignIn = () => {
    router.push("/login");
  };

  const toggleFavorite = () => {
    if (!session?.user) { requireSignIn(); return; }
    if (!favoritesKey) return;
    try {
      const favorites = JSON.parse(window.localStorage.getItem(favoritesKey!) || "[]") as string[];
      const next = favorites.includes(listing.id) ? favorites.filter((id) => id !== listing.id) : [...favorites, listing.id];
      window.localStorage.setItem(favoritesKey!, JSON.stringify(next));
      setFavorite(next.includes(listing.id));
      if (!favorites.includes(listing.id)) {
        void fetch("/api/favorites/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: listing.id }) }).catch(() => undefined);
      }
      window.dispatchEvent(new Event("axion:favorites-updated"));
    } catch {
      setCartMessage("Не удалось сохранить избранное");
    }
  };

  const addToCart = () => {
    if (!session?.user) { requireSignIn(); return; }
    if (!cartKey) return;
    if (unavailable) return;
    try {
      const cart = JSON.parse(window.localStorage.getItem(cartKey!) || "[]") as CartItem[];
      const existing = cart.find((item) => item.id === listing.id);
      if (existing && existing.quantity >= listing.quantity) {
        setCartMessage("Достигнуто доступное количество");
        return;
      }
      const next = existing
        ? cart.map((item) => item.id === listing.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...cart, { id: listing.id, title: listing.title, price: listing.price, quantity: 1 }];
      window.localStorage.setItem(cartKey!, JSON.stringify(next));
      setInCart(true);
      window.dispatchEvent(new Event("axion:cart-updated"));
      setCartMessage("Добавлено в корзину");
    } catch {
      setCartMessage("Не удалось добавить товар");
    }
  };

  return <article className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--accent)]/50 ${view === "list" ? "flex min-h-32 flex-row" : "flex h-full flex-col hover:-translate-y-0.5"}`}>
    <div className={`relative shrink-0 overflow-hidden bg-[var(--background)] ${view === "list" ? "aspect-square w-28 sm:w-36 lg:w-36" : "aspect-square w-full"}`}>
      <Link href={`/product/${listing.id}`} className={`absolute inset-0 ${view === "list" ? "lg:right-1/2" : ""}`} aria-label={listing.title}>
        {listing.images[0] ? <Image src={listing.images[0]} alt={listing.title} fill sizes={view === "list" ? "(max-width: 1023px) 144px, 144px" : "(max-width: 768px) 50vw, 33vw"} className="object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--muted)]"><ImageOff size={28} /></div>}
      </Link>
      {view === "list" && <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[var(--background)] lg:block">
        {listing.images[1] ? <Link href={`/product/${listing.id}`} aria-label={`${listing.title} — фотография 2`} className="absolute inset-0"><Image src={listing.images[1]} alt={`${listing.title} — фотография 2`} fill sizes="144px" className="object-cover" /></Link> : <div className="flex h-full items-center justify-center text-[var(--muted)]"><ImageOff size={24} /></div>}
      </div>}
      <button type="button" onClick={toggleFavorite} disabled={sessionPending} aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} aria-pressed={favorite} title={!session?.user ? "Войдите, чтобы добавить в избранное" : favorite ? "Убрать из избранного" : "В избранное"} className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/85">
        <Heart size={18} className={favorite ? "fill-[var(--accent)] text-[var(--accent)]" : ""} />
      </button>
      <button type="button" onClick={addToCart} disabled={unavailable || sessionPending} aria-label={unavailable ? "Нет в наличии" : "Добавить в корзину"} title={unavailable ? "Нет в наличии" : !session?.user ? "Войдите, чтобы добавить в заказ" : inCart ? "Добавить ещё" : "В заказ"} className="absolute bottom-2 right-2 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-[var(--accent)] text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-80">
        <ShoppingCart size={18} />
      </button>
      {unavailable && <span className="absolute bottom-2 left-2 z-10 rounded-md bg-black/75 px-2 py-1 text-[10px] font-bold text-white">Нет в наличии</span>}
    </div>
    <div className={`flex min-w-0 flex-1 flex-col ${view === "list" ? "justify-center p-3 sm:p-4" : "p-3 sm:p-4"}`}>
      <Link href={`/product/${listing.id}`} className="line-clamp-2 font-bold leading-5 hover:text-[var(--accent)]">{listing.title}</Link>
      {!compact && vehicle && <p className="mt-2 line-clamp-1 text-xs text-[var(--muted)]">{vehicle}</p>}
      {!compact && <p className="mt-1 text-xs text-[var(--muted)]">{listing.quantity > 0 ? `${listing.quantity} шт` : "Нет в наличии"}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <strong className="text-base font-black sm:text-lg">{new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(listing.price)} RUB</strong>
        {cartMessage && <span role="status" className="text-[10px] text-[var(--muted)] sm:text-xs">{cartMessage}</span>}
      </div>
    </div>
  </article>;
}
