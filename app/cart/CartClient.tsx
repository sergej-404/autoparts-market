"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ShoppingCart } from "lucide-react";
import { ListingCard, type PublicListing } from "@/components/cards/ListingCard";
import { formatRussianPhoneInput } from "@/lib/phone";

type CartItem = { id: string; title: string; price: number; quantity: number; includedInOrder?: boolean };
type Fulfillment = "PICKUP" | "OWN_PLACE";
const money = (value: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)} RUB`;

export default function CartClient({ listings }: { listings: PublicListing[] }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const storageScope = sessionPending ? null : (session?.user?.id ?? "guest");
  const cartKey = storageScope === null ? null : `axion_cart:${storageScope}`;
  const favoritesKey = storageScope === null ? null : `axion_favorites:${storageScope}`;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("+7");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("PICKUP");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!cartKey) return;
    const readCart = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(cartKey) || "[]") as CartItem[];
        setCart(parsed.map((item) => ({ ...item, includedInOrder: item.includedInOrder !== false })));
      } catch { setCart([]); }
    };
    readCart();
    window.addEventListener("axion:cart-updated", readCart);
    window.addEventListener("storage", readCart);
    return () => { window.removeEventListener("axion:cart-updated", readCart); window.removeEventListener("storage", readCart); };
  }, [cartKey]);

  const entries = useMemo(() => (cartKey ? cart : []).map((item) => ({ item, listing: listings.find((listing) => listing.id === item.id) })).filter((entry) => entry.listing), [cart, listings, cartKey]);
  const includedEntries = (cartKey ? entries : []).filter(({ item }) => item.includedInOrder !== false);
  const total = includedEntries.reduce((sum, entry) => sum + (entry.listing?.price ?? entry.item.price) * entry.item.quantity, 0);
  const saveCart = (next: CartItem[]) => {
    if (!cartKey) return;
    setCart(next); window.localStorage.setItem(cartKey!, JSON.stringify(next)); window.dispatchEvent(new Event("axion:cart-updated"));
  };
  const setQuantity = (id: string, quantity: number) => {
    const listing = listings.find((item) => item.id === id);
    if (quantity <= 0) { setPendingRemoval(id); return; }
    if (listing && quantity > listing.quantity) return;
    saveCart(cart.map((item) => item.id === id ? { ...item, quantity } : item));
  };
  const toggleIncluded = (id: string, includedInOrder: boolean) => saveCart(cart.map((item) => item.id === id ? { ...item, includedInOrder } : item));
  const confirmRemove = () => { if (pendingRemoval) saveCart(cart.filter((item) => item.id !== pendingRemoval)); setPendingRemoval(null); };
  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice(null);
    if (!customerName.trim() || phone.replace(/\D/g, "").length !== 11) { setNotice({ error: true, text: "Укажите ФИО и полный номер телефона +7." }); return; }
    if (fulfillment === "OWN_PLACE" && !meetingPlace.trim()) { setNotice({ error: true, text: "Укажите удобное место встречи." }); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customerName: customerName.trim(), phone, fulfillment, meetingPlace: meetingPlace.trim(),
        items: includedEntries.map(({ item }) => ({ id: item.id, quantity: item.quantity })),
      }) });
      const result = await response.json() as { error?: string; order?: { orderCode: string } };
      if (!response.ok || !result.order) throw new Error(result.error || "Не удалось оформить заказ.");
      saveCart(cart.filter((item) => item.includedInOrder === false));
      setCheckoutOpen(false); setNotice({ error: false, text: `Заказ ${result.order.orderCode} оформлен. Он доступен в профиле → «Мои заказы».` });
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : "Ошибка оформления заказа." }); }
    finally { setSubmitting(false); }
  };

  return <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-9">
    <nav aria-label="Хлебные крошки" className="mb-5 flex items-center gap-2 text-sm text-[var(--muted)]"><Link href="/" className="hover:text-[var(--accent)]">Главная</Link><span aria-hidden="true">·</span><span className="font-semibold text-[var(--foreground)]">Заказы</span></nav>
    <h1 className="mb-7 text-3xl font-black tracking-tight sm:text-4xl">Заказы</h1>
    {notice && <p role="status" className={`mb-5 rounded-xl border p-3 text-sm ${notice.error ? "border-red-500/40 text-red-500" : "border-emerald-500/40 text-emerald-600"}`}>{notice.text}</p>}
    {cartKey && entries.length ? <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_390px] lg:gap-y-8">
      <section aria-label="Товары" className="grid grid-cols-2 items-start gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-9 lg:grid-cols-3">
        {entries.map(({ item, listing }) => listing && <div key={item.id} className="relative z-0 min-w-0 [isolation:isolate] hover:z-10 focus-within:z-10">
          <ListingCard listing={listing} />
          <label className="absolute left-2 top-2 z-20 inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/30 bg-black/75 shadow" title="Участвует в заказе и сумме">
            <input type="checkbox" aria-label={`Включить ${listing.title} в заказ`} checked={item.includedInOrder !== false} onChange={(event) => toggleIncluded(item.id, event.currentTarget.checked)} className="size-4 accent-[var(--accent)]" />
          </label>
          <div className="relative z-20 mt-3 mb-3 flex items-center justify-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-sm">
            <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label={`Уменьшить количество ${listing.title}`} className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--line)] font-bold hover:border-[var(--accent)]">−</button>
            <span className="min-w-6 text-center font-bold tabular-nums">{item.quantity}</span>
            <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label={`Увеличить количество ${listing.title}`} disabled={listing.quantity <= 0 || item.quantity >= listing.quantity} className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--line)] font-bold hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40">+</button>
          </div>
        </div>)}
      </section>
      <aside className="self-start mt-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 lg:sticky lg:top-24 lg:mt-0">
        <h2 className="text-xl font-black">Чек заказа</h2>
        {includedEntries.length ? <ul className="mt-4 space-y-4">
          {includedEntries.map(({ item, listing }) => <li key={item.id} className="border-b border-[var(--line)] pb-3 text-sm">
            <p className="font-semibold">{listing?.title ?? item.title}</p>
            <p className="mt-1 text-[var(--muted)]">{item.quantity} × {money(listing?.price ?? item.price)} = <strong className="text-[var(--foreground)]">{money((listing?.price ?? item.price) * item.quantity)}</strong></p>
          </li>)}
        </ul> : <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">Отметьте товары, которые хотите включить в заказ.</p>}
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-[var(--muted)]">Итого</span><strong className="text-xl font-black">{money(total)}</strong></div>
        <button type="button" disabled={!includedEntries.length || submitting} onClick={() => { setNotice(null); setCheckoutOpen(true); }} className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40">Оформить</button>
      </aside>
    </div> : <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-14 text-center"><ShoppingCart size={30} className="mx-auto text-[var(--muted)]" /><p className="mt-3 font-semibold">В заказе пока нет товаров.</p><Link href="/catalog" className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)]">Перейти в каталог</Link></div>}

    {checkoutOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setCheckoutOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="my-auto w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6">
        <h2 id="checkout-title" className="text-xl font-black">Оформление заказа</h2>
        <form className="mt-5 space-y-4" onSubmit={submitOrder}>
          <label className="block text-sm font-semibold">ФИО<input required minLength={3} maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.currentTarget.value)} autoComplete="name" className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]" /></label>
          <label className="block text-sm font-semibold">Телефон<input required inputMode="tel" autoComplete="tel" placeholder="+7 (___) ___-__-__" value={phone} onChange={(event) => setPhone(formatRussianPhoneInput(event.currentTarget.value))} className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]" /></label>
          <fieldset><legend className="mb-2 text-sm font-semibold">Способ получения</legend><div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={fulfillment === "PICKUP"} onClick={() => setFulfillment("PICKUP")} className={`rounded-xl border px-3 py-3 text-sm font-bold ${fulfillment === "PICKUP" ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--line)]"}`}>Самовывоз</button>
            <button type="button" aria-pressed={fulfillment === "OWN_PLACE"} onClick={() => setFulfillment("OWN_PLACE")} className={`rounded-xl border px-3 py-3 text-sm font-bold ${fulfillment === "OWN_PLACE" ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--line)]"}`}>Своё место</button>
          </div></fieldset>
          {fulfillment === "PICKUP" ? <p className="rounded-xl bg-[var(--background)] p-3 text-sm text-[var(--muted)]">После одобрения заказа администратор укажет адрес самовывоза в чеке.</p> : <label className="block text-sm font-semibold">Удобное место встречи<textarea required maxLength={500} rows={3} value={meetingPlace} onChange={(event) => setMeetingPlace(event.currentTarget.value)} placeholder="Укажите место, детали согласуете с администратором" className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]" /></label>}
          {notice?.error && <p role="alert" className="text-sm text-red-500">{notice.text}</p>}
          <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={submitting} onClick={() => setCheckoutOpen(false)} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold disabled:opacity-50">Отмена</button><button type="submit" disabled={submitting || !includedEntries.length} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Оформляем…" : "Подтвердить"}</button></div>
        </form>
      </section>
    </div>}
    {pendingRemoval && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="presentation"><section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl"><h2 className="text-lg font-bold">Удалить этот товар из заказа?</h2><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setPendingRemoval(null)} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold">Отмена</button><button type="button" onClick={confirmRemove} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">Удалить</button></div></section></div>}
  </main>;
}
