"use client";

import { CategoryIcon, categoryIconOptions } from "@/components/categories/CategoryIcon";

import { AdminComments } from "./AdminComments";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgePlus, CarFront, CheckCircle2, FileImage, FolderPlus, LoaderCircle, PackagePlus, Plus, Trash2, Upload, X, Pencil } from "lucide-react";
import Link from "next/link";
import AdminOrders from "./AdminOrders";
import AdminNotifications from "./AdminNotifications";

type Model = { id: string; name: string; years: number[] };
type Make = { id: string; name: string; models: Model[] };
type Category = { id: string; name: string; emoji: string | null };
type Listing = {
  id: string; title: string; description: string; makeId: string | null; modelId: string | null; year: number | null; status: "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK"; images: string[]; price: number; quantity: number; updatedAt: string;
  make: { name: string } | null; model: { name: string } | null; category: { name: string };
};
type AdminData = { makes: Make[]; categories: Category[]; listings: Listing[] };
type Notice = { type: "success" | "error"; text: string };
type Editable = { kind: "category" | "make" | "model" | "listing"; id: string; name: string; emoji?: string | null; years?: number[]; title?: string; description?: string; categoryId?: string; makeId?: string | null; modelId?: string | null; year?: number | null; status?: "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK"; price?: number; quantity?: number; images?: string[] };

const categoryEmojiNames: Record<string, string> = { "🔧": "инструмент ремонт ключ", "⚙️": "шестерня механизм", "🛞": "колесо шина", "🚗": "автомобиль машина", "🚙": "внедорожник машина", "🚘": "автомобиль", "🏎️": "спорткар", "🚕": "такси", "🛠️": "инструменты ремонт", "🔩": "болт гайка", "🧰": "ящик инструментов", "🔋": "аккумулятор батарея", "💡": "лампа свет", "🪫": "разряженная батарея", "🛢️": "масло канистра", "⛽": "топливо бензин", "🧲": "магнит", "🪛": "отвертка", "🔌": "электрика штекер", "🧯": "огнетушитель", "🪟": "стекло окно", "🚪": "дверь", "🪑": "сиденье", "❄️": "кондиционер холод", "🌡️": "температура", "💨": "воздух", "🔊": "динамик звук", "🎵": "музыка", "📻": "радио", "🧭": "навигация", "🪞": "зеркало", "🛑": "тормоз стоп", "🚦": "светофор", "🛡️": "защита", "⭐": "звезда популярное", "❤️": "сердце", "♻️": "переработка", "🔍": "поиск" };
const fieldClass = "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]";
const labelClass = "mb-1.5 block text-sm font-semibold text-[var(--foreground)]";
const categoryEmojis = ["🔧", "⚙️", "🛞", "🚗", "🚙", "🚘", "🏎️", "🚕", "🛠️", "🔩", "🧰", "🔋", "💡", "🪫", "🛢️", "⛽", "🧲", "🪛", "🔌", "🧯", "🪟", "🚪", "🪑", "🧴", "🧽", "🪣", "📦", "📡", "🎛️", "🎚️", "🧪", "🛡️", "🪝", "🧵", "🪢", "❄️", "🌡️", "💨", "🔊", "🎵", "📻", "🧭", "🪞", "🛑", "🚦", "🧱", "🪜", "🧹", "🪚", "🔨", "🪓", "🪠", "🧺", "🛍️", "✨", "⭐", "❤️", "♻️", "🔍", "🧷"];

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"vehicle" | "categories" | "listing" | "orders" | "notifications" | "comments">("vehicle");
  const [data, setData] = useState<AdminData>({ makes: [], categories: [], listings: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [makeName, setMakeName] = useState("");
  const [modelName, setModelName] = useState("");
  const [yearsText, setYearsText] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryEmoji, setCategoryEmoji] = useState("");
  const [editCategoryEmoji, setEditCategoryEmoji] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [compatMakes,setCompatMakes]=useState<string[]>([]);
  const [compatModels,setCompatModels]=useState<string[]>([]);
  const [compatYears,setCompatYears]=useState<number[]>([]);
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAll, setShowAll] = useState<"categories" | "makes" | null>(null);
  const [editing, setEditing] = useState<Editable | null>(null);
  const [editName, setEditName] = useState("");
  const [editYears, setEditYears] = useState<number[]>([]);
  const [editYearInput, setEditYearInput] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editStatus, setEditStatus] = useState<"DRAFT" | "PUBLISHED" | "OUT_OF_STOCK">("DRAFT");
  const [editPrice, setEditPrice] = useState("0");
  const [editQuantity, setEditQuantity] = useState("0");
  const [editMakeId, setEditMakeId] = useState("");
  const [editModelId, setEditModelId] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);

  const selectedMake = data.makes.find((make) => make.id === makeId);
  const compatibilitySelection = useMemo(() => {
    const selections: { makeId: string; modelId: string | null; year: number | null }[] = [];
    for (const make of data.makes.filter(item => compatMakes.includes(item.id))) {
      const models = make.models.filter(model => compatModels.includes(model.id));
      if (!models.length) selections.push({ makeId: make.id, modelId: null, year: null });
      for (const model of models) {
        const years = model.years.filter(value => compatYears.includes(value));
        if (!years.length) selections.push({ makeId: make.id, modelId: model.id, year: null });
        else for (const value of years) selections.push({ makeId: make.id, modelId: model.id, year: value });
      }
    }
    return selections;
  }, [data.makes, compatMakes, compatModels, compatYears]);
  const availableModels = useMemo(() => selectedMake?.models ?? [], [selectedMake]);
  const availableYears = useMemo(() => availableModels.find((model) => model.id === modelId)?.years ?? [], [availableModels, modelId]);

  const loadData = async () => {
    const response = await fetch("/api/admin/catalog", { cache: "no-store" });
    const result = await response.json() as AdminData | { error?: string };
    if (!response.ok) throw new Error("error" in result ? result.error : "Не удалось загрузить данные.");
    setData(result as AdminData);
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/catalog", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as AdminData | { error?: string };
        if (!response.ok) throw new Error("error" in result ? result.error : "Не удалось загрузить данные.");
        if (!controller.signal.aborted) setData(result as AdminData);
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка загрузки." }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const sendJson = async (url: string, body: unknown) => {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "Не удалось сохранить данные.");
  };

  const saveMake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const years = yearsText.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (!years.length || years.some((item) => !Number.isInteger(item))) throw new Error("Укажите годы через запятую, например: 2018, 2019, 2020.");
      await sendJson("/api/admin/catalog", { kind: "make", makeName, modelName, years });
      setMakeName(""); setModelName(""); setYearsText(""); await loadData();
      setNotice({ type: "success", text: "Марка, модель и годы выпуска сохранены." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка сохранения." }); }
    finally { setSaving(false); }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      await sendJson("/api/admin/catalog", { kind: "category", name: categoryName, emoji: categoryEmoji || null });
      setCategoryName(""); setCategoryEmoji(""); await loadData(); setNotice({ type: "success", text: "Категория добавлена." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка сохранения." }); }
    finally { setSaving(false); }
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    if (images.length + files.length > 10) { setNotice({ type: "error", text: "Можно добавить не более 10 фотографий." }); return; }
    setUploading(true); setNotice(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData(); formData.set("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || "Не удалось загрузить фотографию.");
        uploaded.push(result.url);
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка загрузки фото." }); }
    finally { setUploading(false); }
  };

  const uploadEditImages = async (files: FileList | null) => {
    if (!files?.length) return;
    if (editImages.length + files.length > 10) { setNotice({ type: "error", text: "Можно добавить не более 10 фотографий." }); return; }
    setUploading(true); setNotice(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData(); formData.set("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || "Не удалось загрузить фотографию.");
        uploaded.push(result.url);
      }
      setEditImages((current) => [...current, ...uploaded]);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка загрузки фото." }); }
    finally { setUploading(false); }
  };

  const deleteEdit = async () => {
    if (!editing || !window.confirm("Удалить эту запись? Это действие нельзя отменить.")) return;
    setSaving(true); setNotice(null);
    try {
      const isListing = editing.kind === "listing";
      const response = await fetch(isListing ? "/api/admin/listings" : "/api/admin/catalog", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isListing ? { id: editing.id } : { id: editing.id, kind: editing.kind }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось удалить запись.");
      setEditing(null); await loadData(); setNotice({ type: "success", text: "Запись удалена." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка удаления." }); }
    finally { setSaving(false); }
  };

  const saveListing = async (status: "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK") => {
    setSaving(true); setNotice(null);
    try {
      await sendJson("/api/admin/listings", { title, description, images, makeId: compatibilitySelection[0]?.makeId ?? null, modelId: compatibilitySelection[0]?.modelId ?? null, year: compatibilitySelection[0]?.year ?? null, compatibility: compatibilitySelection, categoryId, price: Number(price), quantity: Number(quantity), status });
      setTitle(""); setDescription(""); setImages([]); setMakeId(""); setModelId(""); setYear(""); setCompatMakes([]); setCompatModels([]); setCompatYears([]); setPrice("0"); setQuantity("0"); setCategoryId("");
      await loadData(); setNotice({ type: "success", text: status === "OUT_OF_STOCK" || (status === "PUBLISHED" && Number(quantity) === 0) ? "Объявление сохранено со статусом «Нет в наличии»." : status === "PUBLISHED" ? "Объявление опубликовано." : "Объявление сохранено как черновик." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка сохранения объявления." }); }
    finally { setSaving(false); }
  };

  const cancelListing = () => { setTitle(""); setDescription(""); setImages([]); setMakeId(""); setModelId(""); setYear(""); setCompatMakes([]); setCompatModels([]); setCompatYears([]); setPrice("0"); setQuantity("0"); setCategoryId(""); setNotice(null); };

  const openEdit = (item: Editable) => {
    setEditing(item); setEditName(item.name); setEditCategoryEmoji(item.emoji ?? ""); setEditYears(item.years ?? []); setEditYearInput("");
    setEditTitle(item.title ?? ""); setEditDescription(item.description ?? "");
    setEditCategoryId(item.categoryId ?? ""); setEditStatus(item.status ?? "DRAFT"); setEditPrice(String(item.price ?? 0)); setEditQuantity(String(item.quantity ?? 0)); setEditMakeId(item.makeId ?? ""); setEditModelId(item.modelId ?? ""); setEditYear(item.year ? String(item.year) : ""); setEditImages((item as Editable & { images?: string[] }).images ?? []); setNotice(null);
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return;
    setSaving(true); setNotice(null);
    try {
      if (editing.kind === "listing") {
        const response = await fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, title: editTitle, description: editDescription, categoryId: editCategoryId, status: editStatus, makeId: editMakeId || null, modelId: editModelId || null, year: editYear || null, images: editImages, price: Number(editPrice), quantity: Number(editQuantity) }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Не удалось изменить объявление.");
      } else {
        const body: Record<string, unknown> = { id: editing.id, kind: editing.kind, name: editName };
        if (editing.kind === "category") body.emoji = editCategoryEmoji || null;
        if (editing.kind === "model") body.years = editYears;
        const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Не удалось изменить запись.");
      }
      setEditing(null); await loadData(); setNotice({ type: "success", text: "Изменения сохранены и применены к данным сайта." });
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Ошибка сохранения." }); }
    finally { setSaving(false); }
  };

  return <main className="min-h-screen bg-[var(--background)] px-4 py-6 pb-24 text-[var(--foreground)] sm:px-6 lg:px-10">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><nav aria-label="Хлебные крошки" className="mb-3 flex items-center gap-2 text-sm text-[var(--muted)]"><Link href="/" className="hover:text-[var(--accent)]">Главная</Link><span aria-hidden="true">·</span><span className="text-[var(--foreground)]">Панель администрации</span></nav><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Панель администрации</h1><p className="mt-2 text-sm text-[var(--muted)]">Справочники автомобилей, категории и управление объявлениями.</p></div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"><CheckCircle2 className="mr-2 inline" size={17} />Доступ администратора</div>
      </div>
      <nav aria-label="Разделы панели администратора" className="mb-6 flex w-full gap-2 overflow-x-auto border-b border-[var(--line)] pb-3">{[{ id: "vehicle", label: "Автомобиль", icon: CarFront }, { id: "categories", label: "Категории", icon: FolderPlus }, { id: "listing", label: "Создание объявления", icon: PackagePlus }, { id: "orders", label: "Заказы", icon: BadgePlus }, { id: "notifications", label: "Уведомления", icon: CheckCircle2 }, { id: "comments", label: "Комментарии", icon: CheckCircle2 }].map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as "vehicle" | "categories" | "listing" | "orders" | "notifications" | "comments")} aria-current={activeTab === tab.id ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${activeTab === tab.id ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}><Icon size={17}/>{tab.label}</button>; })}</nav>
      {notice && <div role={notice.type === "error" ? "alert" : "status"} className={`mb-6 flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${notice.type === "error" ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}><span>{notice.text}</span><button type="button" aria-label="Закрыть уведомление" onClick={() => setNotice(null)}><X size={17} /></button></div>}

      <section className={`mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2 ${activeTab === "vehicle" || activeTab === "categories" ? "" : "hidden"}`}>
        <div className={`${activeTab === "vehicle" ? "" : "hidden "}rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6`}><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-[var(--accent)]/15 p-3 text-[var(--accent)]"><CarFront size={23} /></div><div><h2 className="text-lg font-bold">Подбор по автомобилю</h2><p className="text-sm text-[var(--muted)]">Добавление марки, модели и годов выпуска</p></div></div>
          <form onSubmit={saveMake} className="space-y-4"><div><label className={labelClass} htmlFor="make-name">Марка автомобиля</label><input id="make-name" required minLength={2} maxLength={80} value={makeName} onChange={(event) => setMakeName(event.target.value)} className={fieldClass} placeholder="Например, BMW" /></div><div><label className={labelClass} htmlFor="model-name">Модель</label><input id="model-name" required maxLength={80} value={modelName} onChange={(event) => setModelName(event.target.value)} className={fieldClass} placeholder="Например, X5" /></div><div><label className={labelClass} htmlFor="model-years">Годы выпуска</label><input id="model-years" required value={yearsText} onChange={(event) => setYearsText(event.target.value)} className={fieldClass} placeholder="2018, 2019, 2020, 2021" /><p className="mt-1.5 text-xs text-[var(--muted)]">Укажите отдельные годы через запятую.</p></div><button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><BadgePlus size={17} />{saving ? "Сохранение…" : "Сохранить марку и модель"}</button></form>
          <div className="mt-5 border-t border-[var(--line)] pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Добавленные марки</p>{loading ? <p className="text-sm text-[var(--muted)]">Загрузка…</p> : data.makes.length ? <div className="flex items-center gap-2 overflow-hidden">{data.makes.slice(0, 4).map((make) => <button type="button" key={make.id} onClick={() => openEdit({ kind: "make", id: make.id, name: make.name })} className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs hover:border-[var(--accent)]">{make.name} <span className="text-[var(--muted)]">· {make.models.length} мод.</span></button>)}{data.makes.length > 4 && <button type="button" onClick={() => setShowAll("makes")} className="shrink-0 px-2 py-1.5 text-xs font-bold text-[var(--accent)]">Ещё</button>}</div> : <p className="text-sm text-[var(--muted)]">Марки пока не добавлены.</p>}</div>
        </div>
        <div className={`${activeTab === "categories" ? "" : "hidden "}lg:col-start-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6`}><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-[var(--accent)]/15 p-3 text-[var(--accent)]"><FolderPlus size={23} /></div><div><h2 className="text-lg font-bold">Категории</h2><p className="text-sm text-[var(--muted)]">Категории для объявлений и каталога</p></div></div>
          <form onSubmit={saveCategory} className="space-y-4"><div><label className={labelClass} htmlFor="category-name">Название категории</label><input id="category-name" required minLength={2} maxLength={80} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className={fieldClass} placeholder="Например, Двигатель" /></div><div><label className={labelClass} htmlFor="category-emoji">Эмодзи категории</label><div className="flex gap-2"><input id="category-emoji" value={categoryEmoji} onChange={(event) => setCategoryEmoji(event.target.value)} maxLength={8} className={fieldClass} placeholder="Необязательно" /><button type="button" onClick={() => { setEmojiSearch(""); setEmojiPickerOpen(true); }} className="shrink-0 rounded-xl border border-[var(--line)] px-4 text-xl hover:border-[var(--accent)]" aria-label="Выбрать эмодзи"><CategoryIcon value={categoryEmoji} size={36} /></button></div></div><button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Plus size={17} />{saving ? "Сохранение…" : "Добавить категорию"}</button></form>
          <div className="mt-5 border-t border-[var(--line)] pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Категории в системе</p>{data.categories.length ? <div className="flex items-center gap-2 overflow-hidden">{data.categories.slice(0, 4).map((category) => <button type="button" key={category.id} onClick={() => openEdit({ kind: "category", id: category.id, name: category.name, emoji: category.emoji })} className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs hover:border-[var(--accent)]">{category.name}</button>)}{data.categories.length > 4 && <button type="button" onClick={() => setShowAll("categories")} className="shrink-0 px-2 py-1.5 text-xs font-bold text-[var(--accent)]">Ещё</button>}</div> : <p className="text-sm text-[var(--muted)]">Категории пока не добавлены.</p>}</div>
        </div>
      </section>

      <section className={`${activeTab === "listing" ? "" : "hidden "}mb-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6`}><div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-[var(--accent)]/15 p-3 text-[var(--accent)]"><PackagePlus size={23} /></div><div><h2 className="text-xl font-bold">Создание объявления</h2><p className="text-sm text-[var(--muted)]">Фотографии, характеристики и публикация</p></div></div>
        <div className="mb-6"><label className={labelClass}>Фотографии <span className="font-normal text-[var(--muted)]">({images.length}/10, до 8 МБ каждая)</span></label><div className="grid grid-cols-4 gap-2 md:grid-cols-5">{images.map((image, index) => <div key={image} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--line)]"><img src={image} alt={`Фото объявления ${index + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label={`Удалить фото ${index + 1}`} onClick={() => setImages((current) => current.filter((item) => item !== image))} className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-red-600"><Trash2 size={15} /></button></div>)}{images.length < 10 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--background)] text-center text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading} onChange={(event) => { void uploadImages(event.target.files); event.currentTarget.value = ""; }} />{uploading ? <LoaderCircle className="animate-spin" size={24} /> : <Upload size={24} />}<span>{uploading ? "Загрузка…" : "Добавить фото"}</span></label>}</div><p className="mt-2 text-xs text-[var(--muted)]"><FileImage size={13} className="mr-1 inline" />JPEG, PNG или WebP. Максимум 10 фотографий.</p></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><label className={labelClass} htmlFor="listing-title">Название объявления</label><input id="listing-title" required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} placeholder="Название детали или товара" /></div>
          <fieldset className="md:col-span-2 space-y-3 rounded-xl border border-[var(--line)] p-4"><legend className="px-2 text-sm font-bold">Марки, модели и годы выпуска (множественный выбор)</legend><p className="text-xs text-[var(--muted)]">Отметьте нужные марки, модели и годы. Если годы не отмечены, подходит любой год выбранной модели.</p><div className="flex flex-wrap gap-3">{data.makes.map(make=><label key={make.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={compatMakes.includes(make.id)} onChange={event=>{setCompatMakes(current=>event.target.checked?[...current,make.id]:current.filter(id=>id!==make.id));if(!event.target.checked)setCompatModels(current=>current.filter(id=>!make.models.some(model=>model.id===id)));}}/>{make.name}</label>)}</div><div className="flex flex-wrap gap-3">{data.makes.filter(make=>compatMakes.includes(make.id)).flatMap(make=>make.models.map(model=><label key={model.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={compatModels.includes(model.id)} onChange={event=>setCompatModels(current=>event.target.checked?[...current,model.id]:current.filter(id=>id!==model.id))}/>{make.name} · {model.name}</label>))}</div><div className="flex flex-wrap gap-3">{Array.from(new Set(data.makes.flatMap(make=>make.models.filter(model=>compatModels.includes(model.id)).flatMap(model=>model.years)))).sort((a,b)=>a-b).map(value=><label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={compatYears.includes(value)} onChange={event=>setCompatYears(current=>event.target.checked?[...current,value]:current.filter(item=>item!==value))}/>{value}</label>)}</div><p className="text-xs text-[var(--muted)]">Выбрано сочетаний: {compatibilitySelection.length}</p></fieldset>
          <div><label className={labelClass} htmlFor="listing-category">Категория</label><select id="listing-category" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={fieldClass}><option value="">Выберите категорию</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div><label className={labelClass} htmlFor="listing-price">Цена</label><input id="listing-price" type="number" min="0" step="1" required value={price} onChange={(event) => setPrice(event.target.value)} className={fieldClass} /></div>
          <div><label className={labelClass} htmlFor="listing-quantity">Количество товаров</label><input id="listing-quantity" type="number" min="0" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className={fieldClass} /></div>
          <div className="md:col-span-2"><label className={labelClass} htmlFor="listing-description">Описание</label><textarea id="listing-description" required maxLength={10000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass} placeholder="Опишите состояние, совместимость и особенности товара…" /></div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={cancelListing} disabled={saving || uploading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:border-[var(--accent)] disabled:opacity-50"><X size={17} />Отмена</button><button type="button" onClick={() => void saveListing("DRAFT")} disabled={saving || uploading || !title.trim() || !description.trim() || !categoryId || price === "" || Number(price) < 0 || quantity === "" || Number(quantity) < 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:border-[var(--accent)] disabled:opacity-50">Сохранить как черновик</button><button type="button" onClick={() => void saveListing("PUBLISHED")} disabled={saving || uploading || !title.trim() || !description.trim() || !categoryId || price === "" || Number(price) < 0 || quantity === "" || Number(quantity) < 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"><PackagePlus size={17} />{saving ? "Сохранение…" : "Опубликовать"}</button></div>
      </section>

      <section className={`${activeTab === "listing" ? "" : "hidden "}rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6`}><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Последние объявления</h2><p className="mt-1 text-sm text-[var(--muted)]">Сохранённые публикации и черновики</p></div><span className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm">{data.listings.length}</span></div>
        {loading ? <p className="py-8 text-center text-sm text-[var(--muted)]">Загрузка объявлений…</p> : data.listings.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] py-10 text-center text-sm text-[var(--muted)]">Объявлений пока нет.</div> : <div className="divide-y divide-[var(--line)]">{data.listings.map((listing) => <button type="button" key={listing.id} onClick={() => openEdit({ kind: "listing", id: listing.id, name: listing.title, title: listing.title, description: listing.description, categoryId: data.categories.find((category) => category.name === listing.category.name)?.id ?? "", makeId: listing.makeId, modelId: listing.modelId, year: listing.year, status: listing.status, images: listing.images, price: listing.price, quantity: listing.quantity } as Editable & { images: string[] })} className="flex w-full items-center gap-3 py-4 text-left hover:bg-[var(--background)]"><div className="size-14 shrink-0 overflow-hidden rounded-lg bg-[var(--background)]">{listing.images[0] ? <img src={listing.images[0]} alt="" className="h-full w-full object-cover" /> : <FileImage className="m-auto mt-4 text-[var(--muted)]" size={22} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{listing.title}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{listing.category.name}{listing.make ? ` · ${listing.make.name}` : ""}{listing.model ? ` ${listing.model.name}` : ""}{listing.year ? ` · ${listing.year}` : ""}</p></div><span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${listing.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-300" : listing.status === "OUT_OF_STOCK" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>{listing.status === "PUBLISHED" ? "Опубликовано" : listing.status === "OUT_OF_STOCK" ? "Нет в наличии" : "Черновик"}</span></button>)}</div>}
      </section>
      <div className={activeTab === "orders" ? "mt-8" : "hidden"}><AdminOrders /></div><section className={`${activeTab === "notifications" ? "" : "hidden"}`}><AdminNotifications /></section><section className={activeTab === "comments" ? "" : "hidden"}><AdminComments /></section>

      {showAll && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={showAll === "categories" ? "Все категории" : "Все марки автомобилей"}><div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"><div className="flex items-center justify-between border-b border-[var(--line)] p-5"><h2 className="text-lg font-bold">{showAll === "categories" ? "Все категории" : "Все марки автомобилей"}</h2><button type="button" onClick={() => setShowAll(null)} aria-label="Закрыть" className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button></div><div className="max-h-[65vh] overflow-y-auto p-4"><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{showAll === "categories" ? data.categories.map((item) => <button type="button" key={item.id} onClick={() => { setShowAll(null); openEdit({ kind: "category", id: item.id, name: item.name, emoji: item.emoji }); }} className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3 text-left text-sm hover:border-[var(--accent)]">{item.name}<Pencil size={15} /></button>) : data.makes.map((item) => <button type="button" key={item.id} onClick={() => { setShowAll(null); openEdit({ kind: "make", id: item.id, name: item.name }); }} className="flex items-center justify-between rounded-xl border border-[var(--line)] p-3 text-left text-sm hover:border-[var(--accent)]">{item.name} · {item.models.length} мод.<Pencil size={15} /></button>)}</div></div></div></div>}
      {editing && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Изменение записи"><form onSubmit={saveEdit} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing.kind === "listing" ? "Изменение объявления" : editing.kind === "category" ? "Изменение категории" : editing.kind === "make" ? "Изменение марки" : "Изменение модели"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Закрыть" className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button></div>{editing.kind === "listing" ? <><div><label className={labelClass}>Название</label><input required minLength={3} maxLength={120} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Описание</label><textarea required maxLength={10000} rows={5} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Категория</label><select required value={editCategoryId} onChange={(event) => setEditCategoryId(event.target.value)} className={fieldClass}>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label className={labelClass}>Марка автомобиля</label><select value={editMakeId} onChange={(event) => { setEditMakeId(event.target.value); setEditModelId(""); setEditYear(""); }} className={fieldClass}><option value="">Не указана</option>{data.makes.map((make) => <option key={make.id} value={make.id}>{make.name}</option>)}</select></div><div><label className={labelClass}>Модель</label><select value={editModelId} onChange={(event) => { setEditModelId(event.target.value); setEditYear(""); }} disabled={!editMakeId} className={fieldClass}><option value="">Не указана</option>{(data.makes.find((make) => make.id === editMakeId)?.models ?? []).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></div><div><label className={labelClass}>Год выпуска</label><select value={editYear} onChange={(event) => setEditYear(event.target.value)} disabled={!editModelId} className={fieldClass}><option value="">Не указан</option>{(data.makes.find((make) => make.id === editMakeId)?.models.find((model) => model.id === editModelId)?.years ?? []).map((year) => <option key={year} value={year}>{year}</option>)}</select></div><div><label className={labelClass}>Цена</label><input type="number" min="0" step="1" required value={editPrice} onChange={(event) => setEditPrice(event.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Количество товаров</label><input type="number" min="0" step="1" required value={editQuantity} onChange={(event) => setEditQuantity(event.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Фотографии</label><div className="mb-2 grid grid-cols-4 gap-2 md:grid-cols-5">{editImages.map((image, index) => <div key={`${image}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--line)]"><img src={image} alt={`Фото ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setEditImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label="Удалить фотографию" className="absolute right-1 top-1 rounded-md bg-black/75 p-1"><X size={14} /></button></div>)}</div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"><Upload size={15} />Добавить фото<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || editImages.length >= 10} onChange={(event) => { void uploadEditImages(event.target.files); event.currentTarget.value = ""; }} className="hidden" /></label><p className="mt-1 text-xs text-[var(--muted)]">До 10 фотографий{uploading ? " · Загрузка…" : ""}</p></div><div><label className={labelClass}>Статус</label><select value={editStatus} onChange={(event) => setEditStatus(event.target.value as "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK")} className={fieldClass}><option value="DRAFT">Черновик</option><option value="PUBLISHED">Опубликовано</option><option value="OUT_OF_STOCK">Нет в наличии</option></select></div></> : <><div><label className={labelClass}>Название</label><input required minLength={2} maxLength={80} value={editName} onChange={(event) => setEditName(event.target.value)} className={fieldClass} /></div>{editing.kind === "category" && <div><label className={labelClass} htmlFor="edit-category-emoji">Эмодзи категории</label><div className="flex gap-2"><input id="edit-category-emoji" value={editCategoryEmoji} onChange={(event) => setEditCategoryEmoji(event.target.value)} maxLength={8} className={fieldClass} placeholder="Необязательно" /><button type="button" onClick={() => { setEmojiSearch(""); setEmojiPickerOpen(true); }} className="shrink-0 rounded-xl border border-[var(--line)] px-4 text-xl hover:border-[var(--accent)]" aria-label="Выбрать эмодзи"><CategoryIcon value={editCategoryEmoji} size={36} /></button></div></div>}{editing.kind === "model" && <div><label className={labelClass}>Годы выпуска</label><div className="flex gap-2"><input type="number" min="1886" max={new Date().getFullYear() + 2} value={editYearInput} onChange={(event) => setEditYearInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const yearValue = Number(editYearInput); if (Number.isInteger(yearValue) && yearValue >= 1886 && yearValue <= new Date().getFullYear() + 2 && !editYears.includes(yearValue)) setEditYears((current) => [...current, yearValue].sort((a, b) => a - b)); setEditYearInput(""); } }} className={fieldClass} placeholder="Введите год" /><button type="button" onClick={() => { const yearValue = Number(editYearInput); if (Number.isInteger(yearValue) && yearValue >= 1886 && yearValue <= new Date().getFullYear() + 2 && !editYears.includes(yearValue)) setEditYears((current) => [...current, yearValue].sort((a, b) => a - b)); setEditYearInput(""); }} className="shrink-0 rounded-xl border border-[var(--line)] px-3 text-sm font-semibold hover:border-[var(--accent)]">Добавить</button></div><div className="mt-2 flex flex-wrap gap-2">{editYears.map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs">{item}<button type="button" onClick={() => setEditYears((current) => current.filter((yearValue) => yearValue !== item))} aria-label={`Удалить год ${item}`} className="ml-1 text-[var(--muted)] hover:text-red-400">×</button></span>)}</div></div>}{editing.kind === "make" && <div><p className={labelClass}>Модели этой марки</p><div className="flex flex-wrap gap-2">{(data.makes.find((make) => make.id === editing.id)?.models ?? []).map((model) => <button type="button" key={model.id} onClick={() => openEdit({ kind: "model", id: model.id, name: model.name, years: model.years })} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs hover:border-[var(--accent)]">{model.name} <Pencil size={12} className="ml-1 inline" /></button>)}</div></div>}</>}<div className="flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-4"><button type="button" onClick={() => void deleteEdit()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-400 disabled:opacity-50"><Trash2 size={15} />Удалить</button><div className="flex gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold">Отмена</button><button disabled={saving} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Сохранение…" : "Сохранить изменения"}</button></div></div></form></div>}
      {emojiPickerOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Выбор иконки"><div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl"><div className="flex items-center justify-between border-b border-[var(--line)] p-5"><h2 className="text-lg font-bold">Выберите иконку</h2><button type="button" onClick={() => setEmojiPickerOpen(false)} aria-label="Закрыть" className="rounded-lg p-2 hover:bg-white/10"><X size={18}/></button></div><div className="p-4"><input value={emojiSearch} onChange={(event) => setEmojiSearch(event.target.value)} className={fieldClass} placeholder="Поиск по названию иконки" aria-label="Поиск эмодзи" /></div><div className="grid grid-cols-6 gap-2 overflow-y-auto px-4 pb-4 sm:grid-cols-8">{categoryIconOptions.filter(([, name]) => !emojiSearch || name.toLocaleLowerCase("ru-RU").includes(emojiSearch.trim().toLocaleLowerCase("ru-RU"))).map(([id, name]) => <button key={id} type="button" title={name} onClick={() => { if (editing?.kind === "category") setEditCategoryEmoji(id); else setCategoryEmoji(id); setEmojiPickerOpen(false); }} className="flex aspect-square items-center justify-center rounded-xl border border-[var(--line)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/10" aria-label={`Выбрать ${name}`}><CategoryIcon value={id} size={58} /></button>)}</div><div className="flex justify-end gap-3 border-t border-[var(--line)] p-4"><button type="button" onClick={() => setEmojiPickerOpen(false)} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold">Отмена</button><button type="button" onClick={() => setEmojiPickerOpen(false)} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white">Выбрать</button></div></div></div>}
    </div>
  </main>;
}
