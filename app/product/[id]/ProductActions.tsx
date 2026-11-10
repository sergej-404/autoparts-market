"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { Heart, ShoppingCart, Share2, Copy, X } from "lucide-react";

type Props = { id: string; title: string; price: number; quantity: number; unavailable: boolean };
type CartItem = { id: string; title: string; price: number; quantity: number };
export default function ProductActions({ id, title, price, quantity, unavailable }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const scope = isPending ? null : (session?.user?.id ?? "guest");
  const favKey = scope === null ? null : `axion_favorites:${scope}`;
  const cartKey = scope === null ? null : `axion_cart:${scope}`;
  const favorite = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("axion:favorites-updated", onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener("axion:favorites-updated", onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    () => {
      if (!favKey) return false;
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(favKey) || "[]");
        return Array.isArray(stored) && stored.includes(id);
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  useEffect(()=>{void fetch(`/api/products/${encodeURIComponent(id)}/view`,{method:"POST"}).catch(()=>undefined);},[id]);
  const [notice, setNotice] = useState("");
  const toggleFavorite = () => {
    if (!favKey) return;
    try {
      const current = JSON.parse(localStorage.getItem(favKey) || "[]") as string[];
      const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
      localStorage.setItem(favKey, JSON.stringify(next));
      window.dispatchEvent(new Event("axion:favorites-updated"));
      if (!current.includes(id)) void fetch("/api/favorites/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id }) }).catch(() => undefined);
    } catch { setNotice("Не удалось обновить избранное"); }
  };
  const addToCart = () => {
    if (!cartKey || unavailable) return;
    try {
      const current = JSON.parse(localStorage.getItem(cartKey) || "[]") as CartItem[];
      const existing = current.find(item => item.id === id);
      if (existing && existing.quantity >= quantity) { setNotice("Достигнуто доступное количество"); return; }
      const next = existing ? current.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { id, title, price, quantity: 1 }];
      localStorage.setItem(cartKey, JSON.stringify(next));
      window.dispatchEvent(new Event("axion:cart-updated"));
      setNotice("Добавлено в заказ");
    } catch { setNotice("Не удалось добавить товар"); }
  };
  const share = async () => {
    const url = window.location.href;
    if (window.matchMedia("(max-width: 767px)").matches && navigator.share) {
      try { await navigator.share({ title, url }); } catch (error) { if ((error as Error).name !== "AbortError") setShareOpen(true); }
    } else { setShareOpen(true); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice("Ссылка скопирована"); setShareOpen(false); } catch { setNotice("Не удалось скопировать ссылку"); } };
  const button = "inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--accent)]";
  return <><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={toggleFavorite} disabled={scope === null} className={button} aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} title="Избранное"><Heart size={20} className={favorite ? "fill-red-500 text-red-500" : ""} /></button><button type="button" onClick={addToCart} disabled={unavailable || scope === null} className={button} aria-label="Добавить в заказ" title="Добавить в заказ"><ShoppingCart size={20} /></button><button type="button" onClick={() => void share()} className={button} aria-label="Поделиться товаром" title="Поделиться"><Share2 size={20} /></button><button type="button" onClick={()=>setReportOpen(true)} className={button} title="Пожаловаться" aria-label="Пожаловаться на товар">!</button>{notice && <span role="status" className="text-xs text-[var(--muted)]">{notice}</span>}</div>{reportOpen && <ReportDialog kind="PRODUCT" targetId={id} onClose={()=>setReportOpen(false)}/>} {shareOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={() => setShareOpen(false)}><div role="dialog" aria-modal="true" aria-label="Поделиться товаром" onClick={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Поделиться товаром</h2><button onClick={() => setShareOpen(false)} aria-label="Закрыть"><X size={20}/></button></div><input readOnly value={typeof window === "undefined" ? "" : window.location.href} className="w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm"/><button type="button" onClick={() => void copy()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 font-bold text-white"><Copy size={17}/> Копировать ссылку</button></div></div>}</>;
}
