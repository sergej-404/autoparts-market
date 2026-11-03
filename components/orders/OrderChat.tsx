"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CheckCheck, Paperclip, Send, X } from "lucide-react";

type Photo = { id: string; name: string; url: string };
type Message = { id: string; senderId: string; senderName: string; senderRole: string; text: string; photos: Photo[]; createdAt: string; readAt?: string | null };

export default function OrderChat({ orderId, onRead }: { orderId: string; onRead?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/messages`, { cache: "no-store" });
    const result = await response.json() as { messages?: Message[]; currentUserId?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "Не удалось загрузить сообщения.");
    setMessages(result.messages ?? []);
    setCurrentUserId(result.currentUserId ?? "");
    onRead?.();
  // onRead is a notification callback; avoid resetting the polling loop on parent rerenders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void load().catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Ошибка чата."); }); };
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages.length]);
  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const value = text.trim();
    if ((!value && !photos.length) || sending) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value, photos }) });
      const result = await response.json() as { message?: Message; error?: string };
      if (!response.ok || !result.message) throw new Error(result.error || "Не удалось отправить сообщение.");
      setMessages((current) => [...current, result.message as Message]); setText(""); setPhotos([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка отправки."); } finally { setSending(false); }
  };
  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length + photos.length > 10) { setError("Можно прикрепить не более 10 фотографий."); return; }
    try {
      const added: Photo[] = [];
      for (const file of selected) {
        if (!/image\/(jpeg|png|gif|webp|avif)/.test(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Разрешены изображения JPEG, PNG, GIF, WebP, AVIF до 5 МБ.");
        const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Не удалось прочитать изображение.")); reader.readAsDataURL(file); });
        added.push({ id: crypto.randomUUID(), name: file.name, url });
      }
      if ([...photos, ...added].reduce((sum, photo) => sum + photo.url.length, 0) > 24 * 1024 * 1024) throw new Error("Общий размер фотографий превышает 18 МБ.");
      setPhotos((current) => [...current, ...added]); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось прикрепить фото."); }
    if (fileRef.current) fileRef.current.value = "";
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } };
  return <div className="flex min-h-0 flex-1 flex-col bg-[#0d1216]">
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] before:h-px before:flex-1 before:bg-[var(--line)] after:h-px after:flex-1 after:bg-[var(--line)]">История переписки</div>
      {messages.map((message) => { const mine = message.senderId === currentUserId; return <div key={message.id} className={`flex max-w-[92%] items-end gap-2 sm:max-w-[82%] ${mine ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
        {!mine && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#3b281e] text-[10px] font-bold text-orange-300">{message.senderName.slice(0, 2).toUpperCase()}</span>}
        <div className="min-w-0"><div className={`break-words rounded-[13px] border px-3 py-2.5 text-sm leading-relaxed ${mine ? "rounded-br-sm border-[#7c390f] bg-[#71300f] text-white" : "rounded-bl-sm border-[#2c3942] bg-[#192229]"}`}>
          {message.photos?.length > 0 && <div className="grid grid-cols-2 gap-1.5">{message.photos.map((photo) => <button key={photo.id} type="button" onClick={() => setPreview(photo.url)} aria-label={`Просмотреть ${photo.name}`}><img src={photo.url} alt={photo.name} className="max-h-44 w-full rounded-lg object-cover" /></button>)}</div>}
          {message.text && <p className="mt-1 whitespace-pre-wrap">{message.text}</p>}
        </div><div className={`mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)] ${mine ? "justify-end" : ""}`}><time>{new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time>{mine && message.readAt && <CheckCheck size={13} className="text-sky-300" />}</div></div>
      </div>; })}
      {!messages.length && <p className="py-8 text-center text-sm text-[var(--muted)]">Сообщений пока нет. Начните переписку.</p>}
      <div ref={bottomRef} />
    </div>
    <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] px-3 py-3 sm:px-4">
      {error && <p role="alert" className="mb-2 text-sm text-red-400">{error}</p>}
      {photos.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto">{photos.map((photo) => <div key={photo.id} className="relative shrink-0"><img src={photo.url} alt={photo.name} className="h-16 w-16 rounded-lg object-cover" /><button type="button" aria-label="Убрать фотографию" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} className="absolute right-0 top-0 rounded-full bg-black/80 p-1"><X size={13} /></button></div>)}</div>}
      <form onSubmit={(event) => void submit(event)} className="flex items-end gap-2 rounded-xl border border-[#3a454e] bg-[var(--background)] p-2 focus-within:border-[#8b4a28]">
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Прикрепить фотографию" className="grid h-9 w-9 shrink-0 place-items-center text-[var(--muted)]"><Paperclip size={20} /></button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" multiple className="hidden" onChange={(event) => void attach(event.target.files)} />
        <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} maxLength={250} rows={1} placeholder="Напишите сообщение..." aria-label="Текст сообщения" className="max-h-28 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none" />
        <button type="submit" disabled={sending || (!text.trim() && !photos.length)} aria-label="Отправить сообщение" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-white disabled:opacity-40"><Send size={18} /></button>
      </form>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--muted)]"><span>Enter — отправить · Shift + Enter — новая строка</span><span>{text.length} / 250</span></div>
    </div>
    {preview && <div role="dialog" aria-label="Просмотр фотографии" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-4" onClick={() => setPreview(null)}><button type="button" aria-label="Закрыть" className="absolute right-5 top-5 text-white"><X size={24} /></button><img src={preview} alt="Фотография из переписки" className="max-h-[85vh] max-w-full object-contain" /></div>}
  </div>;
}
