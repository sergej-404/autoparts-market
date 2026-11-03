"use client";

import Link from "next/link";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { useSearchParams } from "next/navigation";
import OrderChat from "@/components/orders/OrderChat";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft, Check, CheckCheck, ChevronRight, Ellipsis, FileImage, MessageCircle,
  Paperclip, Search, Send, Store, UserRound, X, Trash2,
} from "lucide-react";

type PhotoAttachment = { id: string; name: string; url: string };
type Message = { id: string; sender: "seller" | "mine"; text: string; time: string; readAt?: string | null; photos?: PhotoAttachment[] };
type PhotoGallery = { kind: "pending"; index: number; zoomed?: boolean } | { kind: "message"; photos: PhotoAttachment[]; index: number; zoomed?: boolean };
type Conversation = {
  id: string; name: string; initials: string; color: string; online: boolean;
  product: string; sku: string; price: string; listingId: string | null; sellerPublicId: string; isBuyer: boolean; unread: number; time: string;
  preview: string; messages: Message[];
};

const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const initialConversations: Conversation[] = [];
const quickPhrases = ["Здравствуйте! Товар в наличии?", "Подойдёт ли для моего автомобиля?", "Какие условия доставки?"] as const;
const sellerPhrases = ["Здравствуйте! Уточните, пожалуйста, какой товар вас интересует.", "Укажите марку, модель и год автомобиля.", "В каком городе вам удобно получить товар?"] as const;

export function ChatClient() {
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get("orderId");
  const [orderId, setOrderId] = useState<string | null>(requestedOrderId);
  type OrderThread = { id: string; orderCode: string; customerName: string; preview: string; unread: number; time: string };
  const [orderThreads, setOrderThreads] = useState<OrderThread[]>([]);
  const [orderContext, setOrderContext] = useState<{ id: string; orderCode: string; customerName: string; user?: { publicId: string }; createdAt: string; status: string; total: number; fulfillment: "PICKUP" | "OWN_PLACE"; meetingPlace: string | null; pickupAddress: string | null; items: { id: string; title: string; quantity: number; unitPrice: number; lineTotal: number }[] } | null>(null);
  const [orderExpanded, setOrderExpanded] = useState(false);
  const [showOrderChat, setShowOrderChat] = useState(Boolean(requestedOrderId));
  const [orderContextError, setOrderContextError] = useState("");
  const [orderViewerRole, setOrderViewerRole] = useState<"ADMIN" | "MODERATOR" | "USER">("USER");
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "online">("all");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [quickMode, setQuickMode] = useState<"car" | "delivery" | null>(null);
  const [deliveryChoice, setDeliveryChoice] = useState<"Город" | "Пригород" | "Самовывоз" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"delete" | null>(null);
  const [reportOpen,setReportOpen]=useState(false);
  const [toast, setToast] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [quickStartDismissed, setQuickStartDismissed] = useState<Set<string>>(() => new Set());
  const [photoGallery, setPhotoGallery] = useState<PhotoGallery | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const active = conversations.find((chat) => chat.id === activeId) ?? null;
  const visibleConversations = useMemo(() => conversations.filter((chat) => {
    if (chat.messages.length === 0) return false;
    const matches = `${chat.name} ${chat.preview} ${chat.product} ${chat.sku}`.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru").trim());
    return matches && (filter === "all" || (filter === "unread" && chat.unread > 0) || (filter === "online" && chat.online));
  }), [conversations, filter, query]);

  const loadOrderThreads = useCallback(async () => {
    const response = await fetch("/api/chat/order-threads", { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json() as { threads?: OrderThread[] };
    setOrderThreads(result.threads ?? []);
  }, []);
  useEffect(() => {
    const refresh = () => { void loadOrderThreads().catch(() => {}); };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [loadOrderThreads]);
  const visibleOrderThreads = orderThreads.filter((thread) =>
    `${thread.customerName} ${thread.orderCode} ${thread.preview}`.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru").trim()) &&
    (filter === "all" || (filter === "unread" && thread.unread > 0))
  );
  function chooseOrderThread(id: string) {
    setOrderId(id); setOrderContext(null); setOrderContextError(""); setOrderExpanded(false);
    setShowOrderChat(true); setActiveId(""); setMobileChatOpen(true); setMenuOpen(false);
    setOrderThreads((current) => current.map((thread) => thread.id === id ? { ...thread, unread: 0 } : thread));
  }
  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight }); }, [activeId, active?.messages.length]);
  useEffect(() => {
    const unreadCount = conversations.reduce((sum, conversation) => sum + Math.max(0, conversation.unread), 0);
    window.localStorage.setItem("axion_unread_messages", String(unreadCount));
    window.dispatchEvent(new Event("axion:unread-updated"));
  }, [conversations]);
  useEffect(() => {
    let cancelled = false;
    type ApiMessage = { id: string; senderId: string; text: string; photos?: PhotoAttachment[]; readAt?: string | null; createdAt: string };
    type ApiConversation = { id: string; buyerId: string; sellerId: string; listingId: string | null; otherUser: { id: string; name: string; image: string | null; publicId?: string }; seller: { id: string; publicId: string }; listing: { id: string; title: string; price: number } | null; messages: ApiMessage[] };
    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const sellerId = params.get("sellerId");
      const listingId = params.get("listingId");
      let pendingConversation: ApiConversation | undefined;
      if (sellerId && listingId) {
        const createResponse = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sellerId, listingId }) });
        const created = await createResponse.json() as { conversation?: ApiConversation; error?: string };
        if (!createResponse.ok) throw new Error(created.error || "Не удалось открыть диалог.");
        pendingConversation = created.conversation;
      }
      const response = await fetch("/api/chat", { cache: "no-store" });
      const result = await response.json() as { conversations?: ApiConversation[]; currentUserId?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить сообщения.");
      if (cancelled) return;
      const sources = [...(result.conversations ?? [])];
      if (pendingConversation && !sources.some((item) => item.id === pendingConversation!.id)) sources.unshift(pendingConversation);
      const mapped: Conversation[] = sources.map((item) => ({
        id: item.id, name: item.otherUser.name, initials: item.otherUser.name.slice(0, 2).toLocaleUpperCase("ru-RU"), color: "orange", online: false,
        product: item.listing?.title ?? "Общение с продавцом", sku: item.listing?.id ?? "", price: item.listing ? `${item.listing.price} RUB` : "", listingId: item.listing?.id ?? null, sellerPublicId: item.seller.publicId, isBuyer: item.buyerId === result.currentUserId, unread: 0,
        time: item.messages.length ? new Date(item.messages[item.messages.length - 1].createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "",
        preview: item.messages[item.messages.length - 1]?.text || (item.messages[item.messages.length - 1]?.photos?.length ? "Фотография" : "Начните переписку"), messages: item.messages.map((message) => ({ id: message.id, sender: message.senderId === item.buyerId && item.buyerId === item.otherUser.id ? "seller" : message.senderId === item.sellerId && item.sellerId === item.otherUser.id ? "seller" : "mine", text: message.text, photos: message.photos ?? [], readAt: message.readAt ?? null, time: new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) })),
      }));
      // Determine message ownership using the current user's side of each conversation.
      for (const chat of mapped) {
        const source = sources.find((item) => item.id === chat.id);
        if (source) chat.messages = source.messages.map((message) => ({ id: message.id, sender: message.senderId === source.otherUser.id ? "seller" : "mine", text: message.text, photos: message.photos ?? [], readAt: message.readAt ?? null, time: new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }));
      }
      setConversations(mapped);
      const requestedSource = sources.find((item) => item.sellerId === params.get("sellerId") && item.listingId === params.get("listingId"));
      const requested = params.get("sellerId") && params.get("listingId") ? requestedSource?.id ?? "" : "";
      if (requested) { setActiveId(requested); setMobileChatOpen(true); }
      else if (!activeId && mapped.some((item) => item.messages.length) && window.matchMedia("(min-width: 1024px)").matches) setActiveId(mapped.find((item) => item.messages.length)!.id);
    };
    load().catch((cause: unknown) => { if (!cancelled) setToast(cause instanceof Error ? cause.message : "Не удалось загрузить чат."); });
    return () => { cancelled = true; };
  // Load once on mount; selecting conversations is handled separately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!orderId) return;
    const timer = window.setTimeout(() => setMobileChatOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const loadOrder = async () => {
      type OrderContext = { id: string; orderCode: string; customerName: string; user?: { publicId: string }; createdAt: string; status: string; total: number; fulfillment: "PICKUP" | "OWN_PLACE"; meetingPlace: string | null; pickupAddress: string | null; items: { id: string; title: string; quantity: number; unitPrice: number; lineTotal: number }[] };
      let response = await fetch("/api/admin/orders", { cache: "no-store" });
      let result = await response.json() as { orders?: OrderContext[]; error?: string };
      if (!response.ok) {
        response = await fetch("/api/orders", { cache: "no-store" });
        result = await response.json() as { orders?: OrderContext[]; error?: string };
      }
      if (!response.ok) throw new Error(result.error || "Не удалось загрузить заказ.");
      const order = result.orders?.find((item) => item.id === orderId) ?? null;
      if (!order) throw new Error("Заказ не найден или нет доступа к нему.");
      if (!cancelled) { setOrderContext(order); setOrderViewerRole(response.url.includes("/api/admin/orders") ? "ADMIN" : "USER"); }
    };
    loadOrder().catch((cause: unknown) => { if (!cancelled) setOrderContextError(cause instanceof Error ? cause.message : "Не удалось загрузить заказ."); });
    return () => { cancelled = true; };
  }, [orderId]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2800); return () => window.clearTimeout(timer); }, [toast]);

  const refreshConversations = useCallback(async (selectedId?: string) => {
    const response = await fetch(selectedId ? `/api/chat?conversationId=${encodeURIComponent(selectedId)}` : "/api/chat", { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json() as { currentUserId?: string; conversations?: Array<{ id: string; buyerId: string; sellerId: string; otherUser: { id: string; name: string; image: string | null; publicId?: string }; seller: { id: string; publicId: string }; listing: { id: string; title: string; price: number } | null; messages: Array<{ id: string; senderId: string; text: string; photos?: PhotoAttachment[]; readAt?: string | null; createdAt: string }> }> };
    setConversations((current) => (result.conversations ?? []).map((item) => {
      const existing = current.find((chat) => chat.id === item.id);
      return { id: item.id, name: item.otherUser.name, initials: item.otherUser.name.slice(0, 2).toLocaleUpperCase("ru-RU"), color: existing?.color ?? "orange", online: false, product: item.listing?.title ?? "Общение с продавцом", sku: item.listing?.id ?? "", price: item.listing ? `${item.listing.price} RUB` : "", listingId: item.listing?.id ?? null, sellerPublicId: item.seller.publicId, isBuyer: item.buyerId === result.currentUserId, unread: existing?.unread ?? 0, time: item.messages.length ? new Date(item.messages[item.messages.length - 1].createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "", preview: item.messages[item.messages.length - 1]?.text || (item.messages[item.messages.length - 1]?.photos?.length ? "Фотография" : "Начните переписку"), messages: item.messages.map((message) => ({ id: message.id, sender: message.senderId === item.otherUser.id ? "seller" : "mine", text: message.text, photos: message.photos ?? [], readAt: message.readAt, time: new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) })) };
    }));
  }, []);
  useEffect(() => { if (!activeId || conversations.find((chat) => chat.id === activeId)?.messages.length === 0) return; const refresh = () => { void refreshConversations(activeId).catch(() => {}); }; refresh(); const timer = window.setInterval(refresh, 5000); return () => window.clearInterval(timer); }, [activeId, refreshConversations, conversations.find((chat) => chat.id === activeId)?.messages.length === 0]);
  function chooseConversation(chat: Conversation) {
    setText(""); setQuickMode(null); setDeliveryChoice(null); setPhotos([]); setPhotoGallery(null); if (inputRef.current) inputRef.current.style.height = "auto";
    setActiveId(chat.id); setMobileChatOpen(true); setMenuOpen(false);
    void refreshConversations(chat.id).catch(() => {});
    setConversations((items) => items.map((item) => item.id === chat.id ? { ...item, unread: 0 } : item));
  }
  function sendMessage(event?: FormEvent, preset?: string) {
    event?.preventDefault();
    const draft = (preset ?? text).trim();
    const value = preset ? draft : quickMode === "car" ? `Подойдёт ли для моего автомобиля?\nАвтомобиль: ${draft}` : quickMode === "delivery" ? `Какие условия доставки?\nСпособ получения: ${deliveryChoice ?? ""}${draft ? `\n${draft}` : ""}` : draft;
    if (!active || (!value && photos.length === 0) || (quickMode === "car" && !draft) || (quickMode === "delivery" && !deliveryChoice)) return;
    if (Array.from(value).length > 250) { setToast("Максимум 250 символов в одном сообщении."); return; }
    
    void (async () => {
      try {
        const response = await fetch(`/api/chat/${encodeURIComponent(active.id)}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value, photos }) });
        const result = await response.json() as { message?: { id: string; text: string; photos?: PhotoAttachment[]; readAt?: string | null; createdAt: string }; conversationId?: string; error?: string };
        if (!response.ok || !result.message) throw new Error(result.error || "Не удалось отправить сообщение.");
        const message: Message = { id: result.message.id, sender: "mine", text: result.message.text, photos: result.message.photos ?? photos, readAt: result.message.readAt ?? null, time: new Date(result.message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) };
        if (result.conversationId && result.conversationId !== active.id) {
          await refreshConversations(result.conversationId);
          setActiveId(result.conversationId);
        } else {
          setConversations((items) => items.map((chat) => chat.id === active.id ? { ...chat, messages: [...chat.messages, message], preview: value || (photos.length ? "Фотография" : "Начните переписку"), time: "Сейчас", unread: 0 } : chat));
        }
        setText(""); setQuickMode(null); setDeliveryChoice(null); setPhotos([]); setPhotoGallery(null); if (fileRef.current) fileRef.current.value = "";
        if (inputRef.current) inputRef.current.style.height = "auto";
      } catch (cause) { setToast(cause instanceof Error ? cause.message : "Не удалось отправить сообщение."); }
    })();
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  }
  function confirmDelete() {
    if (showOrderChat && orderId) {
      const id = orderId;
      void (async () => {
        try {
          const response = await fetch(`/api/chat/order-threads/${encodeURIComponent(id)}`, { method: "DELETE" });
          const result = await response.json() as { error?: string };
          if (!response.ok) throw new Error(result.error || "Не удалось удалить переписку.");
          setOrderThreads((current) => current.filter((thread) => thread.id !== id));
          setOrderId(null); setShowOrderChat(false); setOrderExpanded(false); setMobileChatOpen(false);
          setModal(null); setMenuOpen(false); setToast("Переписка удалена из вашего списка.");
          window.dispatchEvent(new Event("axion:unread-updated"));
        } catch (cause) { setToast(cause instanceof Error ? cause.message : "Не удалось удалить переписку."); }
      })();
      return;
    }
    if (!active) return;
    void (async () => { try { const response = await fetch(`/api/chat/${encodeURIComponent(active.id)}`, { method: "DELETE" }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "Не удалось удалить диалог."); const remaining = conversations.filter((chat) => chat.id !== active.id);
    setConversations(remaining); setQuickStartDismissed((current) => { const next = new Set(current); next.delete(active.id); return next; }); setActiveId(remaining[0]?.id ?? ""); setModal(null); setMenuOpen(false); setText(""); setPhotos([]); setPhotoGallery(null); setToast("Диалог удалён.");
    if (remaining[0]) setMobileChatOpen(true); else setMobileChatOpen(false); } catch (cause) { setToast(cause instanceof Error ? cause.message : "Не удалось удалить диалог."); } })();
  }

  return <main className="chat-page mx-auto w-full max-w-[1600px] px-0 pb-2 pt-5 sm:px-5 sm:pt-7 lg:px-8">
    <nav aria-label="Хлебные крошки" className="mb-4 px-4 text-sm text-[var(--muted)] sm:px-0"><Link href="/" className="transition hover:text-[var(--accent)]">Главная</Link><span className="mx-2">·</span><span aria-current="page" className="text-[var(--foreground)]">Сообщения</span></nav>
    <div className="mb-4 flex items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-0">
      <div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">На связи с продавцами</p><h1 className="mt-1 text-[28px] font-black tracking-tight sm:text-4xl">Сообщения</h1><p className="mt-1.5 text-xs text-[var(--muted)] sm:text-sm">Все ваши диалоги о товарах и заказах — в одном месте.</p></div>
      <span className="shrink-0 rounded-md bg-[var(--accent)]/10 px-2.5 py-2 text-[11px] font-extrabold text-[var(--accent)] sm:px-3 sm:text-xs">{conversations.filter((chat) => chat.messages.length > 0).length + orderThreads.length} диалогов</span>
    </div>
    <section aria-label="Чаты с продавцами" className="grid h-auto min-h-0 grid-cols-1 overflow-hidden border-y border-[var(--line)] bg-[var(--surface)] sm:h-[640px] sm:min-h-[620px] sm:max-h-[calc(100dvh-260px)] sm:rounded-2xl sm:border lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside aria-label="Список диалогов" className={`${mobileChatOpen ? "hidden" : "flex"} min-h-0 flex-col border-r border-[var(--line)] lg:flex`}>
        <div className="border-b border-[var(--line)] px-4 py-4 sm:flex sm:h-auto sm:min-h-[116px] sm:flex-col sm:justify-start sm:py-4"><div className="mb-3 hidden items-center justify-between"><h2 className="text-base font-bold">Ваши диалоги</h2><span className="rounded-md bg-[var(--accent)]/10 px-2 py-1 text-xs font-extrabold text-[var(--accent)]">{visibleConversations.length}</span></div>
          <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--muted)] sm:mt-1"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Найти диалог…" aria-label="Найти диалог" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" /></label>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Фильтр диалогов">{([ ["all", "Все"], ["unread", "Непрочитанные"], ["online", "В сети"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${filter === value ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{label}</button>)}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-visible p-1.5 sm:overflow-y-auto">
          {visibleOrderThreads.map((thread) => <button key={thread.id} type="button" onClick={() => chooseOrderThread(thread.id)} aria-pressed={showOrderChat && orderId === thread.id} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${showOrderChat && orderId === thread.id ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.06]" : "border-transparent hover:bg-white/[0.03]"}`}>
            <span className="relative grid h-[43px] w-[43px] shrink-0 place-items-center rounded-xl bg-[#3b281e] text-[13px] font-extrabold text-orange-300">{thread.customerName.slice(0, 2).toLocaleUpperCase("ru-RU")}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-extrabold">{thread.customerName}</span><span className="shrink-0 text-[10px] text-[var(--muted)]">{thread.time}</span></span>
            <span className={`mt-1 block truncate text-xs ${thread.unread ? "font-bold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{thread.preview}</span>
            <span className="mt-1.5 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-[var(--muted)]">Заказ · {thread.orderCode}</span>{thread.unread > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-md bg-[var(--accent)] px-1 text-[10px] font-extrabold text-white">{thread.unread}</span>}</span></span>
          </button>)}
          {orderId && !orderThreads.some((thread) => thread.id === orderId) && <button type="button" onClick={() => chooseOrderThread(orderId)} className="mb-2 w-full rounded-xl border border-[var(--accent)]/40 p-3 text-left text-sm">Переписка по заказу {orderContext?.orderCode ?? orderId}</button>}
          {visibleConversations.map((chat) => <button key={chat.id} type="button" onClick={() => { setShowOrderChat(false); chooseConversation(chat); }} aria-pressed={activeId === chat.id} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${activeId === chat.id ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.06]" : "border-transparent hover:bg-white/[0.03]"}`}>
          <Avatar chat={chat} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-extrabold">{chat.name}</span><span className="shrink-0 text-[10px] text-[var(--muted)]">{chat.time}</span></span><span className={`mt-1 block truncate text-xs ${chat.unread ? "font-bold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{chat.preview}</span><span className="mt-1.5 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-[var(--muted)]">{chat.product} · {chat.sku}</span>{chat.unread > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-md bg-[var(--accent)] px-1 text-[10px] font-extrabold text-white">{chat.unread}</span>}</span></span>
        </button>)}{visibleConversations.length === 0 && visibleOrderThreads.length === 0 && <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">Диалоги не найдены.</p>}</div>
      </aside>
      <section aria-label="Открытая переписка" className={`${mobileChatOpen ? "fixed inset-0 z-[100] flex h-[100dvh] w-screen" : "hidden"} min-h-0 min-w-0 flex-col bg-[#0d1216] [background-color:#0d1216] lg:relative lg:inset-auto lg:z-auto lg:flex lg:h-auto lg:w-auto`}>
        {orderId && showOrderChat ? <>
          <header className="relative flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)]/90 px-3 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5"><button type="button" onClick={() => setMobileChatOpen(false)} aria-label="К списку диалогов" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 lg:hidden"><ArrowLeft size={19}/></button><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#3b281e] text-xs font-extrabold text-orange-300">{orderViewerRole === "ADMIN" || orderViewerRole === "MODERATOR" ? (orderContext?.customerName ?? "З").slice(0, 2).toLocaleUpperCase("ru-RU") : "АМ"}</span><div className="min-w-0"><h2 className="truncate text-sm font-extrabold">{orderViewerRole === "ADMIN" || orderViewerRole === "MODERATOR" ? orderContext?.customerName ?? "Заказчик" : "Администрация магазина"}</h2><p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">Заказ {orderContext?.orderCode ?? ""}</p></div></div>
            <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label="Меню переписки" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"><Ellipsis size={21}/></button></div>
            {menuOpen && <><button type="button" aria-label="Закрыть меню" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)}/><div className="absolute right-3 top-[60px] z-20 w-52 rounded-xl border border-[var(--line)] bg-[#171f25] p-1.5 shadow-xl"><button type="button" onClick={() => { setMenuOpen(false); setModal("delete"); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-white/5">Удалить переписку</button></div></>}
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-[var(--line)] bg-[var(--surface)]">
              <button type="button" aria-expanded={orderExpanded} aria-controls="order-receipt" onClick={() => setOrderExpanded((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/[0.03]"><span className="min-w-0"><span className="block truncate text-sm font-bold">Чек заказа {orderContext?.orderCode ?? ""}</span><span className="block text-xs text-[var(--muted)]">{orderExpanded ? "Скрыть состав заказа" : "Посмотреть товары, количество и сумму"}</span></span><ChevronRight size={18} className={`shrink-0 transition-transform ${orderExpanded ? "rotate-90" : ""}`}/></button>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
              {orderExpanded && <div id="order-receipt" className="absolute inset-x-0 top-0 z-20 max-h-[calc(100%-112px)] space-y-2 overflow-y-auto overscroll-contain rounded-b-xl border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs shadow-xl sm:text-sm" role="region" aria-label="Состав заказа">
                {orderContext ? <><div className="flex flex-wrap justify-between gap-2 text-[var(--muted)]"><span>{new Date(orderContext.createdAt).toLocaleString("ru-RU")}</span><span>Статус: {orderContext.status}</span></div>{orderViewerRole === "ADMIN" && orderContext.user?.publicId && <p className="text-[var(--muted)]">ID покупателя: {orderContext.user.publicId}</p>}<div className="space-y-2">{orderContext.items.map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] pb-2"><span className="min-w-0 flex-1">{item.title}</span><span className="shrink-0 tabular-nums">{item.quantity} × {new Intl.NumberFormat("ru-RU").format(item.unitPrice)} ₽ = {new Intl.NumberFormat("ru-RU").format(item.lineTotal)} ₽</span></div>)}</div><p className="text-right font-extrabold">Всего: {new Intl.NumberFormat("ru-RU").format(orderContext.total)} ₽</p></> : <p className="text-[var(--muted)]">{orderContextError || "Загрузка заказа…"}</p>}
              </div>}
            {orderContextError && <p role="alert" className="px-4 py-2 text-sm text-red-400">{orderContextError}</p>}
            <OrderChat key={orderId} orderId={orderId} onRead={() => { void loadOrderThreads(); window.dispatchEvent(new Event("axion:unread-updated")); }}/>
            </div>
          </div>
        </> : active ? <>
          <header className="relative flex min-h-[72px] items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)]/90 px-3 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5"><button type="button" onClick={() => setMobileChatOpen(false)} aria-label="К списку диалогов" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 lg:hidden"><ArrowLeft size={19} /></button><Avatar chat={active} large /><div className="min-w-0"><h2 className="truncate text-sm font-extrabold">{active.name}</h2><p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">{active.online && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{active.online ? "В сети" : "Не в сети"}</p></div></div>
            <div className="flex shrink-0 items-center gap-1"><Link href="/seller-profile" aria-label="Профиль продавца" title="Профиль продавца" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"><UserRound size={18} /></Link><button type="button" aria-label="Меню переписки" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"><Ellipsis size={21} /></button></div>
            {menuOpen && <><button aria-label="Закрыть меню" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} /><div className="absolute right-3 top-[60px] z-20 w-52 rounded-xl border border-[var(--line)] bg-[#171f25] p-1.5 shadow-xl"><button type="button" onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/5">Пожаловаться</button><button type="button" onClick={() => { setMenuOpen(false); setModal("delete"); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-white/5">Удалить переписку</button></div></>}
          </header>
          {active.listingId && <div className="shrink-0 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs" aria-label="Обсуждаемый товар"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{active.product}</p><p className="text-[var(--muted)]">ID продавца: {active.sellerPublicId} · {active.price}</p></div><Link href={`/product/${encodeURIComponent(active.listingId)}`} className="shrink-0 rounded-lg border border-[var(--line)] px-3 py-2 hover:border-[var(--accent)]">К товару</Link></div></div>}
          <div ref={messagesRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3 sm:gap-5 sm:p-6">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">{active.messages.length ? "История переписки" : "Начало переписки"}</div>
            {active.id === "north" && <div className="mb-1 flex max-w-full items-center gap-3 rounded-xl border border-[#3a332c] bg-[#191713] p-2.5 sm:max-w-[390px]"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#262a2d] text-[var(--accent)]"><Store size={23} /></div><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-wider text-orange-300">Обсуждение товара</p><p className="truncate text-xs font-bold">{active.product}</p><p className="text-[11px] text-[var(--muted)]">Артикул {active.sku} · Совместимость уточняется</p></div><span className="shrink-0 text-xs font-extrabold">{active.price.replace(/€|EUR/gi, "RUB").replace(/(?:\s*RUB){2,}/gi, " RUB")}</span></div>}
            {active.messages.map((message) => <div key={message.id} className={`flex max-w-[92%] items-end gap-2 sm:max-w-[82%] ${message.sender === "mine" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              {message.sender === "seller" && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-extrabold ${active.color === "orange" ? "bg-[#3b281e] text-orange-300" : "bg-[#1e3444] text-sky-200"}`}>{active.initials}</span>}
              <div className="min-w-0"><div className={`overflow-wrap-anywhere break-words rounded-[13px] px-3 py-2.5 text-[13px] leading-relaxed ${message.sender === "mine" ? "rounded-br-sm border border-[#7c390f] bg-[#71300f] text-white" : "rounded-bl-sm border border-[#2a353e] bg-[#182128] text-[#e8edf0]"}`}>
                {message.photos?.length ? <button type="button" onClick={() => setPhotoGallery({ kind: "message", photos: message.photos!, index: 0, zoomed: false })} className="grid grid-cols-2 gap-1.5">{message.photos.map((photo) => <img key={photo.id} src={photo.url} alt={photo.name} className="max-h-40 w-full rounded-lg object-cover" />)}</button> : null}
                {message.text && <p className={message.photos?.length ? "mt-2 whitespace-pre-wrap" : "whitespace-pre-wrap"}>{message.text.split(/(\/product\/[a-zA-Z0-9]+)/g).map((part, index) => /^\/product\/[a-zA-Z0-9]+$/.test(part) ? <Link key={index} href={part} className="mt-2 block rounded-lg border border-white/25 px-3 py-2 font-semibold underline">Перейти к товару</Link> : <span key={index}>{part}</span>)}</p>}
              </div><p className={`mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)] ${message.sender === "mine" ? "justify-end" : ""}`}>{message.time}{message.sender === "mine" && (message.readAt ? <CheckCheck size={13} className="text-sky-300" aria-label="Прочитано" /> : <Check size={13} className="text-orange-300" aria-label="Отправлено" />)}</p></div>
            </div>)}
            {active.messages.length === 0 && <div className="mx-auto mt-2 max-w-md text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"><MessageCircle size={22} /></div><p className="mt-3 text-sm font-bold">Начните разговор</p><p className="mt-1 text-xs text-[var(--muted)]">Выберите фразу ниже или напишите свой вопрос продавцу.</p></div>}
          </div>
          <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            {(active.isBuyer ? active.messages.length === 0 : !active.messages.some(message => message.sender === "mine")) && !quickStartDismissed.has(active.id) && <div className="mb-3"><p className="mb-2 text-xs text-[var(--muted)]">Быстрый старт</p>{quickMode === "car" ? <div className="space-y-1 text-xs"><p className="font-semibold">Подойдёт ли для моего автомобиля?</p><p className="text-[var(--muted)]">Напишите марку и модель автомобиля в поле ниже и отправьте сообщение.</p><button type="button" className="underline" onClick={() => setQuickMode(null)}>Другой вопрос</button></div> : quickMode === "delivery" ? <div className="space-y-2 text-xs"><p className="font-semibold">Какие условия доставки?</p><div className="flex flex-wrap gap-2">{(["Город", "Пригород", "Самовывоз"] as const).map((choice) => <button key={choice} type="button" aria-pressed={deliveryChoice === choice} onClick={() => setDeliveryChoice(choice)} className={`rounded-lg border px-3 py-2 ${deliveryChoice === choice ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)]"}`}>{choice}</button>)}</div><p className="text-[var(--muted)]">Дополнительный текст можно написать ниже.</p><button type="button" className="underline" onClick={() => { setQuickMode(null); setDeliveryChoice(null); }}>Другой вопрос</button></div> : <div className="flex flex-wrap gap-2">{(active.isBuyer ? quickPhrases : sellerPhrases).map((phrase, index) => <button key={phrase} type="button" onClick={() => { if (active.isBuyer && index === 1) setQuickMode("car"); else if (active.isBuyer && index === 2) setQuickMode("delivery"); else sendMessage(undefined, active.isBuyer && index === 0 ? `${phrase}\nТовар: ${active.product}\nID продавца: ${active.sellerPublicId}\nЦена: ${active.price}\n/product/${active.listingId ?? ""}` : phrase); }} className="rounded-lg border border-[var(--line)] bg-[var(--background)] px-2.5 py-2 text-left text-[11px] text-[var(--foreground)] transition hover:border-[var(--accent)]">{phrase}</button>)}</div>}</div>}
            {photos.length > 0 && <div aria-label="Выбранные фотографии" className="mb-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">{photos.map((item, index) => <button key={item.id} type="button" onClick={() => setPhotoGallery({ kind: "pending", index, zoomed: false })} aria-label={`Просмотреть фотографию ${index + 1}: ${item.name}`} title={`${item.name} — нажмите для просмотра или удаления`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)] ring-offset-2 ring-offset-[var(--surface)] hover:ring-2 hover:ring-[var(--accent)]"><img src={item.url} alt={item.name} className="h-full w-full object-cover" /><span className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/80 text-white" onClick={(event) => { event.stopPropagation(); setPhotos((current) => current.filter((photo) => photo.id !== item.id)); setPhotoGallery(null); }}><X size={12} /></span><span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[9px] text-white">{index + 1}</span></button>)}</div>}
            <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-xl border border-[#3a454e] bg-[var(--background)] p-2 focus-within:border-[#8b4a28]">
              <button type="button" aria-label="Прикрепить фотографию" title="Прикрепить фотографию" onClick={() => fileRef.current?.click()} className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"><Paperclip size={19} /></button>
              <textarea ref={inputRef} value={text} maxLength={250} rows={1} onChange={(e) => { const nextText = Array.from(e.target.value).slice(0, 250).join(""); setText(nextText); if (nextText.trim() && active && !quickMode) setQuickStartDismissed((current) => new Set(current).add(active.id)); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 140)}px`; }} onKeyDown={handleKeyDown} aria-label="Текст сообщения, максимум 250 символов" placeholder={quickMode === "car" ? "Марка и модель автомобиля…" : quickMode === "delivery" ? "Дополнительная информация (необязательно)…" : "Напишите сообщение…"} className="max-h-[140px] min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-[13px] leading-5 outline-none placeholder:text-[var(--muted)]" />
              <button type="submit" disabled={quickMode === "car" ? !text.trim() : quickMode === "delivery" ? !deliveryChoice : !text.trim() && photos.length === 0} aria-label="Отправить сообщение" title="Отправить" className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const files = Array.from(e.target.files ?? []); if (!files.length) return; const valid: File[] = []; for (const file of files) { if (!file.type.startsWith("image/")) { setToast(`${file.name}: можно прикрепить только изображение.`); continue; } if (file.size > 8 * 1024 * 1024) { setToast(`${file.name}: размер фотографии не должен превышать 8 МБ.`); continue; } valid.push(file); } const remaining = Math.max(0, 10 - photos.length); const existingBytes = photos.reduce((sum, photo) => sum + Math.max(0, Math.floor((photo.url.length - photo.url.indexOf(",") - 1) * 3 / 4)), 0); const totalLimit = 18 * 1024 * 1024; let acceptedBytes = existingBytes; const fitting = valid.filter((file) => { const fits = acceptedBytes + file.size <= totalLimit; if (fits) acceptedBytes += file.size; else setToast("Общий размер фотографий в сообщении не должен превышать 18 МБ."); return fits; }); if (valid.length > remaining) setToast("За одно сообщение можно прикрепить не более 10 фотографий."); const picked = fitting.slice(0, remaining); try { const loaded = await Promise.all(picked.map((file) => new Promise<PhotoAttachment>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve({ id: `${Date.now()}-${Math.random()}-${file.name}`, name: file.name, url: reader.result }) : reject(new Error("Не удалось прочитать файл")); reader.onerror = () => reject(new Error("Не удалось прочитать файл")); reader.readAsDataURL(file); }))); setPhotos((current) => [...current, ...loaded]); if (loaded.length && active) setQuickStartDismissed((current) => new Set(current).add(active.id)); } catch { setToast("Не удалось загрузить одну из фотографий. Попробуйте ещё раз."); } e.target.value = ""; }} />
            </form><div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[10px] text-[var(--muted)]"><span>Enter — отправить · Shift + Enter — новая строка</span><span className={Array.from(text).length >= 230 ? "text-[var(--accent)]" : ""}>{Array.from(text).length} / 250</span></div>
          </div>
          {photoGallery && <div className="absolute inset-x-0 top-0 bottom-[150px] z-30 flex min-h-0 flex-col overflow-hidden border-b border-[var(--line)] bg-[#10161c]/[0.98] shadow-2xl backdrop-blur sm:bottom-[145px]" role="dialog" aria-modal="false" aria-label="Просмотр фотографий">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 sm:px-5"><div className="min-w-0"><p className="text-sm font-extrabold">{photoGallery.kind === "pending" ? "Прикреплённые фотографии" : "Фотографии в сообщении"}</p><p className="mt-0.5 text-[11px] text-[var(--muted)]">{photoGallery.kind === "pending" ? `${photos.length} из 10 фотографий · можно удалить ненужные` : `${photoGallery.photos.length} фотографий`}</p></div><button type="button" onClick={() => setPhotoGallery(null)} aria-label="Закрыть просмотр фотографий" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/10 hover:text-white"><X size={19} /></button></div>
            <div className="relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">{(photoGallery.kind === "pending" ? photos : photoGallery.photos).map((item, index) => <div key={item.id} className={`relative aspect-square overflow-hidden rounded-lg border ${photoGallery.index === index ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40" : "border-[var(--line)]"}`}><button type="button" onClick={() => setPhotoGallery((current) => current ? { ...current, index, zoomed: true } : current)} aria-label={`Увеличить фотографию ${index + 1}`} className="h-full w-full"><img src={item.url} alt={item.name} className="h-full w-full object-cover" /></button>{photoGallery.kind === "pending" && <button type="button" aria-label={`Удалить фотографию ${item.name}`} onClick={() => { setPhotos((current) => current.filter((photo) => photo.id !== item.id)); setPhotoGallery((current) => { if (!current || current.kind !== "pending") return current; return photos.length <= 1 ? null : { ...current, index: Math.min(current.index >= index ? Math.max(0, current.index - 1) : current.index, photos.length - 2) }; }); }} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-black/75 text-white hover:bg-red-600"><Trash2 size={14} /></button>}</div>)}</div>
              {photoGallery.zoomed && (photoGallery.kind === "pending" ? photos : photoGallery.photos).length > 0 && <button type="button" onClick={() => setPhotoGallery((current) => current ? { ...current, zoomed: false } : current)} aria-label="Закрыть увеличенный просмотр" className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-3 sm:p-6"><img src={(photoGallery.kind === "pending" ? photos : photoGallery.photos)[Math.min(photoGallery.index, (photoGallery.kind === "pending" ? photos : photoGallery.photos).length - 1)]?.url} alt="Увеличенный просмотр фотографии" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" /></button>}
            </div>
            {photoGallery.kind === "pending" && <div className="shrink-0 border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] sm:px-5">Поле сообщения остаётся доступным ниже.</div>}
          </div>}
        </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageCircle size={36} className="text-[var(--muted)]" /><h2 className="mt-4 text-lg font-bold">Пока нет диалогов</h2><p className="mt-2 max-w-sm text-sm text-[var(--muted)]">Перейдите в каталог и начните общение со страницы товара или профиля продавца.</p><Link href="/catalog" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">Перейти в каталог <ChevronRight size={16} /></Link></div>}
      </section>
    </section>
    {toast && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-40px)] rounded-xl border border-[var(--line)] bg-[#14221a] px-4 py-3 text-sm text-emerald-100 shadow-xl">{toast}</div>}
    {reportOpen && active && <ReportDialog kind="CHAT" targetId={active.id} onClose={()=>setReportOpen(false)}/>}
    {modal && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-5 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}><section role="dialog" aria-modal="true" aria-labelledby="chat-modal-title" className="w-full max-w-[420px] rounded-2xl border border-[var(--line)] bg-[#12191f] p-6 text-center shadow-2xl"><h2 id="chat-modal-title" className="text-xl font-extrabold">{modal === "delete" ? "Удалить переписку?" : "Пожаловаться на диалог?"}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{modal === "delete" ? showOrderChat ? "Переписка исчезнет из вашего списка, но заказ и история сообщений сохранятся. Новое сообщение снова покажет диалог." : "Диалог будет скрыт из вашего списка. При новом сообщении переписка появится снова." : "Отправка жалобы будет подключена вместе с серверной логикой модерации."}</p><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-lg border border-[var(--line)] bg-[#202930] px-4 py-2.5 text-sm font-bold">Отмена</button>{modal === "delete" ? <button type="button" onClick={confirmDelete} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">Удалить</button> : <button type="button" onClick={() => { setModal(null); setToast("Жалобы пока не отправляются: серверная логика ещё не подключена."); }} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">Понятно</button>}</div></section></div>}
  </main>;
}

function Avatar({ chat, large = false }: { chat: Conversation; large?: boolean }) {
  const colors: Record<string, string> = { orange: "bg-[#3b281e] text-orange-300", blue: "bg-[#1e3444] text-sky-200", purple: "bg-[#302741] text-purple-200", green: "bg-[#1d3a31] text-emerald-200" };
  return <span className={`relative grid shrink-0 place-items-center rounded-xl font-extrabold ${large ? "h-10 w-10 text-xs" : "h-[43px] w-[43px] text-[13px]"} ${colors[chat.color] ?? colors.orange}`}>{chat.initials}{chat.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-emerald-400" />}</span>;
}
