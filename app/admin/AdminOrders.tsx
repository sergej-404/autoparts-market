"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

type OrderStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";
type OrderItem = { id: string; title: string; quantity: number; unitPrice: number; lineTotal: number };
type AdminOrder = {
  id: string; orderCode: string; customerName: string; phone: string; fulfillment: "PICKUP" | "OWN_PLACE";
  meetingPlace: string | null; pickupAddress: string | null; status: OrderStatus; total: number; createdAt: string;
  user: { id: string; publicId: string; name: string | null; email: string }; items: OrderItem[];
};
type Filter = "ALL" | "APPROVED" | "PENDING" | "COMPLETED";
const money = (value: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)} RUB`;
const statusLabels: Record<OrderStatus, string> = { PENDING: "Ожидает", APPROVED: "Одобрено", COMPLETED: "Завершён", CANCELLED: "Отменён" };

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const loadOrders = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await response.json() as { orders?: AdminOrder[]; error?: string };
    if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы.");
    setOrders(result.orders ?? []);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/orders", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { orders?: AdminOrder[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы.");
        if (!controller.signal.aborted) setOrders(result.orders ?? []);
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Ошибка загрузки заказов."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const visibleOrders = useMemo(() => orders.filter((order) => filter === "ALL" || order.status === filter), [orders, filter]);
  const changeStatus = async (order: AdminOrder, status: Exclude<OrderStatus, "PENDING">) => {
    setBusyId(order.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, status, pickupAddress: addresses[order.id] ?? order.pickupAddress ?? "" }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось изменить статус.");
      await loadOrders(); setNotice(`Заказ ${order.orderCode}: ${statusLabels[status]}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка изменения статуса."); }
    finally { setBusyId(null); }
  };
  return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Заказы</h2><p className="mt-1 text-sm text-[var(--muted)]">Заказчики и управление статусами</p></div><button type="button" onClick={() => void loadOrders().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Ошибка обновления."))} className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/>Обновить</button></div>
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр заказов">{([{ id: "ALL", label: "Все" }, { id: "APPROVED", label: "Одобренные" }, { id: "PENDING", label: "Ожидают" }, { id: "COMPLETED", label: "Завершены" }] as const).map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold ${filter === item.id ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{item.label}</button>)}</div>
    {error && <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{notice && <p role="status" className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p>}
    {loading ? <p className="py-8 text-center text-sm text-[var(--muted)]">Загрузка заказов…</p> : visibleOrders.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">Заказов в этой категории нет.</p> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{visibleOrders.map((order) => <article key={order.id} className="flex min-w-0 flex-col rounded-xl border border-[var(--line)] p-3">
      <div className="flex flex-wrap items-start gap-1.5"><h3 className="break-all text-sm font-black">{order.orderCode}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.status === "CANCELLED" ? "bg-red-500/10 text-red-300" : order.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-300" : order.status === "APPROVED" ? "bg-sky-500/10 text-sky-300" : "bg-amber-500/10 text-amber-300"}`}>{statusLabels[order.status]}</span></div>
      <time className="mt-1 text-[11px] text-[var(--muted)]">{new Date(order.createdAt).toLocaleDateString("ru-RU")}</time>
      <p className="mt-2 truncate text-sm font-semibold" title={order.customerName}>{order.customerName}</p><p className="truncate text-xs text-[var(--muted)]">{order.phone}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">ID покупателя: {order.user.publicId}</p>
      <p className="mt-2 text-base font-black">{money(order.total)}</p><p className="mt-1 text-xs">{order.fulfillment === "PICKUP" ? "Самовывоз" : "Своё место"}</p>
      {order.fulfillment === "OWN_PLACE" && order.meetingPlace && <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">{order.meetingPlace}</p>}{order.pickupAddress && <p className="mt-1 line-clamp-2 text-[11px] text-emerald-300">Адрес: {order.pickupAddress}</p>}
      <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">Состав заказа ({order.items.length})</summary><ul className="mt-2 space-y-1">{order.items.map((item) => <li key={item.id} className="text-xs"><span>{item.title}</span><span className="block text-[var(--muted)]">{item.quantity} × {money(item.unitPrice)} = {money(item.lineTotal)}</span></li>)}</ul></details>
      {order.status === "PENDING" && order.fulfillment === "PICKUP" && <input aria-label="Место для самовывоза" maxLength={500} value={addresses[order.id] ?? order.pickupAddress ?? ""} onChange={(event) => { const value = event.currentTarget.value; setAddresses((current) => ({ ...current, [order.id]: value })); }} placeholder="Место самовывоза" className="mt-2 min-w-0 rounded-lg border border-[var(--line)] bg-transparent px-2 py-2 text-xs outline-none focus:border-[var(--accent)]" />}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-3">{order.status === "PENDING" && <><button type="button" onClick={() => void changeStatus(order, "APPROVED")} disabled={busyId === order.id || (order.fulfillment === "PICKUP" && !(addresses[order.id] ?? order.pickupAddress ?? "").trim())} title={order.fulfillment === "PICKUP" && !(addresses[order.id] ?? order.pickupAddress ?? "").trim() ? "Сначала укажите место самовывоза" : undefined} className="rounded-lg bg-[var(--accent)] px-2.5 py-2 text-xs font-bold text-white disabled:opacity-50">Одобрить</button><button type="button" disabled={busyId === order.id} onClick={() => void changeStatus(order, "CANCELLED")} className="rounded-lg border border-red-500/40 px-2.5 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Отменить</button></>}{order.status === "APPROVED" && <><button type="button" disabled={busyId === order.id} onClick={() => void changeStatus(order, "COMPLETED")} className="rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white disabled:opacity-50">Завершить</button><button type="button" disabled={busyId === order.id} onClick={() => void changeStatus(order, "CANCELLED")} className="rounded-lg border border-red-500/40 px-2.5 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Отменить</button></>}
      <Link href={`/chat?orderId=${encodeURIComponent(order.id)}&userId=${encodeURIComponent(order.user.id)}`} title="Открыть чат по заказу" aria-label={`Чат по заказу ${order.orderCode}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold hover:border-[var(--accent)]"><MessageCircle size={16}/><span>Чат</span></Link></div>
    </article>)}</div>}
  </section>;
}
