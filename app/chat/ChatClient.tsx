"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft, CheckCheck, ChevronRight, Ellipsis, FileImage, MessageCircle,
  Paperclip, Search, Send, Store, UserRound, X, Trash2,
} from "lucide-react";

type PhotoAttachment = { id: string; name: string; url: string };
type Message = { id: string; sender: "seller" | "mine"; text: string; time: string; photos?: PhotoAttachment[] };
type PhotoGallery = { kind: "pending"; index: number; zoomed?: boolean } | { kind: "message"; photos: PhotoAttachment[]; index: number; zoomed?: boolean };
type Conversation = {
  id: string; name: string; initials: string; color: string; online: boolean;
  product: string; sku: string; price: string; unread: number; time: string;
  preview: string; messages: Message[];
};

const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const starterMessages: Message[] = [
  { id: "n1", sender: "seller", text: "Здравствуйте! Вы интересовались тормозными колодками AX-2048. Подскажем по совместимости — напишите марку, модель и год автомобиля.", time: "12:28" },
  { id: "n2", sender: "mine", text: "Добрый день! Подойдут ли они для Volkswagen Golf 7, 2018 года?", time: "12:34" },
  { id: "n3", sender: "seller", text: "Сейчас проверим по каталогу. Уточните, пожалуйста, объём двигателя.", time: "12:38" },
  { id: "n4", sender: "mine", text: "1.4 TSI, 125 л.с.", time: "12:40" },
  { id: "n5", sender: "seller", text: "Да, деталь есть в наличии. Отправим завтра. Перед оформлением ещё раз сверим VIN, чтобы всё точно подошло.", time: "12:42" },
];
const initialConversations: Conversation[] = [
  { id: "north", name: "Север Авто", initials: "СА", color: "orange", online: true, product: "Тормозные колодки передние", sku: "AX-2048", price: "€ 42,90", unread: 2, time: "12:42", preview: "Да, деталь есть в наличии. Отправим завтра.", messages: starterMessages },
  { id: "garage", name: "Garage Parts", initials: "GP", color: "blue", online: true, product: "Масляный фильтр", sku: "OF-110", price: "€ 12,50", unread: 0, time: "Вчера", preview: "Спасибо за заказ! Будем на связи.", messages: [
    { id: "g1", sender: "seller", text: "Здравствуйте! Фильтр OF-110 подходит для вашего автомобиля.", time: "Вчера" },
    { id: "g2", sender: "mine", text: "Отлично, заказ оформил. Спасибо!", time: "Вчера" },
    { id: "g3", sender: "seller", text: "Спасибо за заказ! Будем на связи.", time: "Вчера" },
  ] },
  { id: "autoline", name: "AutoLine Market", initials: "AM", color: "purple", online: false, product: "Воздушный фильтр", sku: "AF-305", price: "€ 18,00", unread: 1, time: "Пн", preview: "Уточните, пожалуйста, модель автомобиля.", messages: [
    { id: "a1", sender: "seller", text: "Добрый день! По артикулу AF-305 есть несколько вариантов.", time: "Пн" },
    { id: "a2", sender: "seller", text: "Уточните, пожалуйста, модель автомобиля.", time: "Пн" },
  ] },
  { id: "parts", name: "Parts Hub", initials: "PH", color: "green", online: false, product: "Свечи зажигания", sku: "SP-221", price: "€ 24,00", unread: 0, time: "12 окт.", preview: "Отправили вам информацию о доставке.", messages: [
    { id: "p1", sender: "seller", text: "Заказ передан в службу доставки.", time: "12 окт." },
    { id: "p2", sender: "seller", text: "Отправили вам информацию о доставке.", time: "12 окт." },
  ] },
  { id: "start", name: "ДетальМаркет", initials: "ДМ", color: "green", online: true, product: "Запрос по товару", sku: "AX-500", price: "€ 59,00", unread: 0, time: "Новый", preview: "Начните переписку с продавцом", messages: [] },
  { id: "autopoint", name: "AutoPoint Riga", initials: "AR", color: "blue", online: true, product: "Аккумулятор", sku: "BAT-74", price: "€ 89,00", unread: 0, time: "11 окт.", preview: "Можем подготовить заказ к вечеру.", messages: [] },
  { id: "motorline", name: "MotorLine", initials: "ML", color: "purple", online: false, product: "Ремень ГРМ", sku: "TB-820", price: "€ 36,00", unread: 0, time: "10 окт.", preview: "Спасибо, получили ваш запрос.", messages: [] },
  { id: "eurospares", name: "Euro Spares", initials: "ES", color: "orange", online: true, product: "Фара передняя", sku: "HL-410", price: "€ 112,00", unread: 0, time: "9 окт.", preview: "Доставка обычно занимает 2–3 дня.", messages: [] },
  { id: "autobox", name: "AutoBox", initials: "AB", color: "green", online: false, product: "Масляный фильтр", sku: "OF-300", price: "€ 9,90", unread: 0, time: "8 окт.", preview: "Будем рады помочь с подбором.", messages: [] },
  { id: "speedcar", name: "SpeedCar Parts", initials: "SP", color: "blue", online: false, product: "Амортизатор", sku: "SH-116", price: "€ 74,00", unread: 0, time: "7 окт.", preview: "Проверим наличие и сообщим вам.", messages: [] },
];
const quickPhrases = ["Здравствуйте! Товар в наличии?", "Подойдёт ли для моего автомобиля?", "Какие условия доставки?"];

export function ChatClient() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState("north");
  const [filter, setFilter] = useState<"all" | "unread" | "online">("all");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"delete" | "report" | null>(null);
  const [toast, setToast] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [photoGallery, setPhotoGallery] = useState<PhotoGallery | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const active = conversations.find((chat) => chat.id === activeId) ?? null;
  const visibleConversations = useMemo(() => conversations.filter((chat) => {
    const matches = `${chat.name} ${chat.preview} ${chat.product} ${chat.sku}`.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru").trim());
    return matches && (filter === "all" || (filter === "unread" && chat.unread > 0) || (filter === "online" && chat.online));
  }), [conversations, filter, query]);

  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight }); }, [activeId, active?.messages.length]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2800); return () => window.clearTimeout(timer); }, [toast]);

  function chooseConversation(chat: Conversation) {
    setActiveId(chat.id); setMobileChatOpen(true); setMenuOpen(false);
    setConversations((items) => items.map((item) => item.id === chat.id ? { ...item, unread: 0 } : item));
  }
  function sendMessage(event?: FormEvent, preset?: string) {
    event?.preventDefault();
    const value = (preset ?? text).trim();
    if (!active || (!value && photos.length === 0)) return;
    if (Array.from(value).length > 250) { setToast("Максимум 250 символов в одном сообщении."); return; }
    const sentPhotos = photos;
    const message: Message = { id: `${Date.now()}-${Math.random()}`, sender: "mine", text: value, time: now(), ...(sentPhotos.length ? { photos: sentPhotos } : {}) };
    const preview = sentPhotos.length ? `📷 Фотографии (${sentPhotos.length})${value ? ` · ${value}` : ""}` : value;
    setConversations((items) => items.map((chat) => chat.id === active.id ? { ...chat, messages: [...chat.messages, message], preview, time: "Сейчас", unread: 0 } : chat));
    setText(""); setPhotos([]); setPhotoGallery(null); if (fileRef.current) fileRef.current.value = "";
    if (inputRef.current) inputRef.current.style.height = "auto";
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  }
  function confirmDelete() {
    if (!active) return;
    const remaining = conversations.filter((chat) => chat.id !== active.id);
    setConversations(remaining); setActiveId(remaining[0]?.id ?? ""); setModal(null); setMenuOpen(false); setText(""); setPhotos([]); setPhotoGallery(null); setToast("Диалог удалён из демонстрационного списка.");
    if (remaining[0]) setMobileChatOpen(true); else setMobileChatOpen(false);
  }

  return <main className="chat-page mx-auto w-full max-w-[1600px] px-0 pb-2 pt-5 sm:px-5 sm:pt-7 lg:px-8">
    <nav aria-label="Хлебные крошки" className="mb-4 px-4 text-sm text-[var(--muted)] sm:px-0"><Link href="/" className="transition hover:text-[var(--accent)]">Главная</Link><span className="mx-2">·</span><span aria-current="page" className="text-[var(--foreground)]">Сообщения</span></nav>
    <div className="mb-4 flex items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-0">
      <div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">На связи с продавцами</p><h1 className="mt-1 text-[28px] font-black tracking-tight sm:text-4xl">Сообщения</h1><p className="mt-1.5 text-xs text-[var(--muted)] sm:text-sm">Все ваши диалоги о товарах и заказах — в одном месте.</p></div>
      <span className="shrink-0 rounded-md bg-[var(--accent)]/10 px-2.5 py-2 text-[11px] font-extrabold text-[var(--accent)] sm:px-3 sm:text-xs">{conversations.length} {conversations.length === 1 ? "диалог" : conversations.length >= 2 && conversations.length <= 4 ? "диалога" : "диалогов"}</span>
    </div>
    <section aria-label="Чаты с продавцами" className="grid h-auto min-h-0 grid-cols-1 overflow-hidden border-y border-[var(--line)] bg-[var(--surface)] sm:h-[640px] sm:min-h-[620px] sm:max-h-[calc(100dvh-260px)] sm:rounded-2xl sm:border lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside aria-label="Список диалогов" className={`${mobileChatOpen ? "hidden" : "flex"} min-h-0 flex-col border-r border-[var(--line)] lg:flex`}>
        <div className="border-b border-[var(--line)] px-4 py-4 sm:flex sm:h-auto sm:min-h-[116px] sm:flex-col sm:justify-start sm:py-4"><div className="mb-3 hidden items-center justify-between"><h2 className="text-base font-bold">Ваши диалоги</h2><span className="rounded-md bg-[var(--accent)]/10 px-2 py-1 text-xs font-extrabold text-[var(--accent)]">{visibleConversations.length}</span></div>
          <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 text-[var(--muted)] sm:mt-1"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Найти диалог…" aria-label="Найти диалог" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" /></label>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Фильтр диалогов">{([ ["all", "Все"], ["unread", "Непрочитанные"], ["online", "В сети"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${filter === value ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{label}</button>)}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-visible p-1.5 sm:overflow-y-auto">{visibleConversations.map((chat) => <button key={chat.id} type="button" onClick={() => chooseConversation(chat)} aria-pressed={activeId === chat.id} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${activeId === chat.id ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.06]" : "border-transparent hover:bg-white/[0.03]"}`}>
          <Avatar chat={chat} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-extrabold">{chat.name}</span><span className="shrink-0 text-[10px] text-[var(--muted)]">{chat.time}</span></span><span className={`mt-1 block truncate text-xs ${chat.unread ? "font-bold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{chat.preview}</span><span className="mt-1.5 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-[var(--muted)]">{chat.product} · {chat.sku}</span>{chat.unread > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-md bg-[var(--accent)] px-1 text-[10px] font-extrabold text-white">{chat.unread}</span>}</span></span>
        </button>)}{visibleConversations.length === 0 && <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">Диалоги не найдены.</p>}</div>
      </aside>
      <section aria-label="Открытая переписка" className={`${mobileChatOpen ? "fixed inset-0 z-[100] flex h-[100dvh] w-screen" : "hidden"} min-h-0 min-w-0 flex-col bg-[#0d1216] [background-color:#0d1216] lg:relative lg:inset-auto lg:z-auto lg:flex lg:h-auto lg:w-auto`}>
        {active ? <>
          <header className="relative flex min-h-[72px] items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)]/90 px-3 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5"><button type="button" onClick={() => setMobileChatOpen(false)} aria-label="К списку диалогов" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 lg:hidden"><ArrowLeft size={19} /></button><Avatar chat={active} large /><div className="min-w-0"><h2 className="truncate text-sm font-extrabold">{active.name}</h2><p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">{active.online && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}{active.online ? "В сети" : "Не в сети"}</p></div></div>
            <div className="flex shrink-0 items-center gap-1"><Link href="/profile" aria-label="Профиль продавца" title="Профиль продавца" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"><UserRound size={18} /></Link><button type="button" aria-label="Меню переписки" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"><Ellipsis size={21} /></button></div>
            {menuOpen && <><button aria-label="Закрыть меню" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} /><div className="absolute right-3 top-[60px] z-20 w-52 rounded-xl border border-[var(--line)] bg-[#171f25] p-1.5 shadow-xl"><button type="button" onClick={() => { setMenuOpen(false); setModal("report"); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/5">Пожаловаться</button><button type="button" onClick={() => { setMenuOpen(false); setModal("delete"); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-white/5">Удалить переписку</button></div></>}
          </header>
          <div ref={messagesRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3 sm:gap-5 sm:p-6">
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">{active.messages.length ? "История переписки" : "Начало переписки"}</div>
            {active.id === "north" && <div className="mb-1 flex max-w-full items-center gap-3 rounded-xl border border-[#3a332c] bg-[#191713] p-2.5 sm:max-w-[390px]"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#262a2d] text-[var(--accent)]"><Store size={23} /></div><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-wider text-orange-300">Обсуждение товара</p><p className="truncate text-xs font-bold">{active.product}</p><p className="text-[11px] text-[var(--muted)]">Артикул {active.sku} · Совместимость уточняется</p></div><span className="shrink-0 text-xs font-extrabold">{active.price}</span></div>}
            {active.messages.map((message) => <div key={message.id} className={`flex max-w-[92%] items-end gap-2 sm:max-w-[82%] ${message.sender === "mine" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              {message.sender === "seller" && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-extrabold ${active.color === "orange" ? "bg-[#3b281e] text-orange-300" : "bg-[#1e3444] text-sky-200"}`}>{active.initials}</span>}
              <div className="min-w-0"><div className={`overflow-wrap-anywhere break-words rounded-[13px] px-3 py-2.5 text-[13px] leading-relaxed ${message.sender === "mine" ? "rounded-br-sm border border-[#7c390f] bg-[#71300f] text-white" : "rounded-bl-sm border border-[#2a353e] bg-[#182128] text-[#e8edf0]"}`}>
                {message.photos?.length ? <button type="button" onClick={() => setPhotoGallery({ kind: "message", photos: message.photos!, index: 0, zoomed: false })} className="flex items-center gap-1.5 font-semibold text-orange-100 underline decoration-orange-100/50 underline-offset-2 hover:text-white"><FileImage size={15} />Просмотреть фотографии ({message.photos.length} шт.)</button> : null}
                {message.text && <p className={message.photos?.length ? "mt-2 whitespace-pre-wrap" : "whitespace-pre-wrap"}>{message.text}</p>}
              </div><p className={`mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)] ${message.sender === "mine" ? "justify-end" : ""}`}>{message.time}{message.sender === "mine" && <CheckCheck size={13} className="text-orange-300" />}</p></div>
            </div>)}
            {active.messages.length === 0 && <div className="mx-auto mt-2 max-w-md text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"><MessageCircle size={22} /></div><p className="mt-3 text-sm font-bold">Начните разговор</p><p className="mt-1 text-xs text-[var(--muted)]">Выберите фразу ниже или напишите свой вопрос продавцу.</p></div>}
          </div>
          <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            {active.messages.length === 0 && <div className="mb-3"><p className="mb-2 text-xs text-[var(--muted)]">Быстрый старт</p><div className="flex flex-wrap gap-2">{quickPhrases.map((phrase) => <button key={phrase} type="button" onClick={() => sendMessage(undefined, phrase)} className="rounded-lg border border-[var(--line)] bg-[var(--background)] px-2.5 py-2 text-left text-[11px] text-[var(--foreground)] transition hover:border-[var(--accent)]">{phrase}</button>)}</div></div>}
            {photos.length > 0 && <div aria-label="Выбранные фотографии" className="mb-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">{photos.map((item, index) => <button key={item.id} type="button" onClick={() => setPhotoGallery({ kind: "pending", index, zoomed: false })} aria-label={`Просмотреть фотографию ${index + 1}: ${item.name}`} title={`${item.name} — нажмите для просмотра или удаления`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)] ring-offset-2 ring-offset-[var(--surface)] hover:ring-2 hover:ring-[var(--accent)]"><img src={item.url} alt={item.name} className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[9px] text-white">{index + 1}</span></button>)}</div>}
            <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-xl border border-[#3a454e] bg-[var(--background)] p-2 focus-within:border-[#8b4a28]">
              <button type="button" aria-label="Прикрепить фотографию" title="Прикрепить фотографию" onClick={() => fileRef.current?.click()} className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"><Paperclip size={19} /></button>
              <textarea ref={inputRef} value={text} maxLength={250} rows={1} onChange={(e) => { setText(Array.from(e.target.value).slice(0, 250).join("")); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 140)}px`; }} onKeyDown={handleKeyDown} aria-label="Текст сообщения, максимум 250 символов" placeholder="Напишите сообщение…" className="max-h-[140px] min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-[13px] leading-5 outline-none placeholder:text-[var(--muted)]" />
              <button type="submit" disabled={!text.trim() && photos.length === 0} aria-label="Отправить сообщение" title="Отправить" className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const files = Array.from(e.target.files ?? []); if (!files.length) return; const valid: File[] = []; for (const file of files) { if (!file.type.startsWith("image/")) { setToast(`${file.name}: можно прикрепить только изображение.`); continue; } if (file.size > 8 * 1024 * 1024) { setToast(`${file.name}: размер фотографии не должен превышать 8 МБ.`); continue; } valid.push(file); } const remaining = Math.max(0, 10 - photos.length); if (valid.length > remaining) setToast("За одно сообщение можно прикрепить не более 10 фотографий."); const picked = valid.slice(0, remaining); try { const loaded = await Promise.all(picked.map((file) => new Promise<PhotoAttachment>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve({ id: `${Date.now()}-${Math.random()}-${file.name}`, name: file.name, url: reader.result }) : reject(new Error("Не удалось прочитать файл")); reader.onerror = () => reject(new Error("Не удалось прочитать файл")); reader.readAsDataURL(file); }))); setPhotos((current) => [...current, ...loaded]); } catch { setToast("Не удалось загрузить одну из фотографий. Попробуйте ещё раз."); } e.target.value = ""; }} />
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
    {modal && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-5 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}><section role="dialog" aria-modal="true" aria-labelledby="chat-modal-title" className="w-full max-w-[420px] rounded-2xl border border-[var(--line)] bg-[#12191f] p-6 text-center shadow-2xl"><h2 id="chat-modal-title" className="text-xl font-extrabold">{modal === "delete" ? "Удалить переписку?" : "Пожаловаться на диалог?"}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{modal === "delete" ? "Диалог исчезнет из демонстрационного списка. Это действие нельзя отменить." : "Отправка жалобы будет подключена вместе с серверной логикой модерации."}</p><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-lg border border-[var(--line)] bg-[#202930] px-4 py-2.5 text-sm font-bold">Отмена</button>{modal === "delete" ? <button type="button" onClick={confirmDelete} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">Удалить</button> : <button type="button" onClick={() => { setModal(null); setToast("Жалобы пока не отправляются: серверная логика ещё не подключена."); }} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">Понятно</button>}</div></section></div>}
  </main>;
}

function Avatar({ chat, large = false }: { chat: Conversation; large?: boolean }) {
  const colors: Record<string, string> = { orange: "bg-[#3b281e] text-orange-300", blue: "bg-[#1e3444] text-sky-200", purple: "bg-[#302741] text-purple-200", green: "bg-[#1d3a31] text-emerald-200" };
  return <span className={`relative grid shrink-0 place-items-center rounded-xl font-extrabold ${large ? "h-10 w-10 text-xs" : "h-[43px] w-[43px] text-[13px]"} ${colors[chat.color] ?? colors.orange}`}>{chat.initials}{chat.online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-emerald-400" />}</span>;
}
