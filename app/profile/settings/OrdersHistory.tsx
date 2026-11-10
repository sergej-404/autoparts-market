"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = { id: string; title: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = { id: string; orderCode: string; customerName: string; phone: string; fulfillment: "PICKUP" | "OWN_PLACE"; meetingPlace: string | null; pickupAddress: string | null; status: "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED"; total: number; createdAt: string; items: OrderItem[] };
const money = (value: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)} RUB`;

export default function OrdersHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказы.");
      setOrders(result.orders ?? []);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Ошибка загрузки заказов.")).finally(() => setLoading(false));
  }, []);
  const deleteOrder = async () => {
    if (!pendingDeleteId || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(pendingDeleteId)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось отменить заказ.");
      setOrders(current => current.map(order => order.id === pendingDeleteId ? { ...order, status: "CANCELLED" } : order));
      
      setPendingDeleteId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка отмены заказа."); }
    finally { setDeleting(false); }
  };
  const selected = orders.find((order) => order.id === selectedId);
  const statusLabel = (status: Order["status"]) => status === "PENDING" ? "Ожидает одобрения" : status === "APPROVED" ? "Одобрен" : status === "COMPLETED" ? "Завершён" : "Отменён";
  return <section className="space-y-4">
    <div><h2 className="text-xl font-bold sm:text-2xl">Мои заказы</h2><p className="mt-1 text-sm text-[var(--muted)]">История заказов и чеки из вашей учётной записи.</p></div>
    {loading ? <div className="rounded-xl border border-[var(--line)] p-6 text-sm text-[var(--muted)]">Загружаем заказы…</div> : error ? <p role="alert" className="rounded-xl border border-red-500/40 p-4 text-sm text-red-500">{error}</p> : orders.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center"><h3 className="font-bold">Заказов пока нет</h3><p className="mt-2 text-sm text-[var(--muted)]">Оформленные заказы появятся здесь.</p><a href="/cart" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white">Перейти к заказам</a></div> : <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-2">{orders.map((order) => <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === order.id ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--line)] hover:border-[var(--accent)]"}`}><div className="flex items-start justify-between gap-3"><strong>{order.orderCode}</strong><span className="text-xs text-[var(--muted)]">{statusLabel(order.status)}</span></div><p className="mt-2 text-xs text-[var(--muted)]">{new Date(order.createdAt).toLocaleString("ru-RU")}</p><p className="mt-2 font-bold">{money(order.total)}</p><p className="mt-1 text-xs text-[var(--muted)]">{order.items.length} позиций</p></button>)}</div>
      {selected ? <section className="rounded-xl border border-[var(--line)] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-black">Чек заказа</h3><p className="mt-1 text-sm text-[var(--muted)]">ID: {selected.orderCode}</p></div><span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">{statusLabel(selected.status)}</span></div>
        <dl className="mt-4 grid gap-2 text-sm"><div><dt className="inline text-[var(--muted)]">Получение: </dt><dd className="inline font-semibold">{selected.fulfillment === "PICKUP" ? "Самовывоз" : "Своё место"}</dd></div>{selected.fulfillment === "OWN_PLACE" ? <div><dt className="inline text-[var(--muted)]">Место встречи: </dt><dd className="inline">{selected.meetingPlace || "Не указано"}</dd></div> : <div><dt className="inline text-[var(--muted)]">Адрес самовывоза: </dt><dd className="inline">{selected.pickupAddress || (selected.status === "APPROVED" ? "Адрес уточняется администратором" : "Будет указан после одобрения")}</dd></div>}</dl>
        <ul className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">{selected.items.map((item) => <li key={item.id} className="border-b border-[var(--line)] pb-3 text-sm"><p className="font-semibold">{item.title}</p><p className="mt-1 text-[var(--muted)]">{item.quantity} × {money(item.unitPrice)} = <strong className="text-[var(--foreground)]">{money(item.lineTotal)}</strong></p></li>)}</ul><div className="mt-4 flex justify-between gap-3"><strong>Итого</strong><strong className="text-lg">{money(selected.total)}</strong></div>{selected.status === "CANCELLED" && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">Заказ отменён.</p>}{selected.status === "COMPLETED" && <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">Заказ завершён.</p>}<Link href={`/chat?orderId=${encodeURIComponent(selected.id)}`} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]">Чат по заказу</Link>{selected.status === "PENDING" && <button type="button" onClick={() => setPendingDeleteId(selected.id)} className="mt-4 ml-2 inline-flex min-h-10 items-center rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10">Отменить заказ</button>}</section> : <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">Выберите заказ слева, чтобы открыть чек.</div>}
    </div>}
    {pendingDeleteId && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-order-title" className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl"><h3 id="delete-order-title" className="text-xl font-bold">Отменить ожидающий заказ?</h3><p className="mt-3 text-sm text-[var(--muted)]">Заказ перейдёт в статус «Отменён». Чек и переписка сохранятся в истории.</p><div className="mt-5 flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setPendingDeleteId(null)} className="rounded-lg border border-[var(--line)] px-4 py-2">Назад</button><button type="button" disabled={deleting} onClick={() => void deleteOrder()} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{deleting ? "Отмена…" : "Да, отменить"}</button></div></section></div>}
  </section>;
}
