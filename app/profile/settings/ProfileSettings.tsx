"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, Check, CircleHelp, Eye, LockKeyhole,
  LogOut, Package, Handshake, BarChart3, Palette, Settings2, SlidersHorizontal,
  UserRound, X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatRussianPhoneInput, normalizeRussianPhone } from "@/lib/phone";
import OrdersHistory from "./OrdersHistory";
import { PushNotifications } from "@/components/profile/PushNotifications";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
};

type ProfileStats = { totalListings: number; publishedListings: number; favoritesReceived: number };
type NotificationPreferences = { site: boolean; orders: boolean; messages: boolean };
type Props = { user: ProfileUser; stats: ProfileStats; notificationPreferences: NotificationPreferences };
type ThemeMode = "dark" | "light" | "system";
type ProfileTab = "settings" | "orders" | "partnership" | "statistics";

const roleLabels: Record<string, string> = {
  USER: "Пользователь",
  MODERATOR: "Модератор",
  ADMIN: "Администратор",
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? "").join("").toLocaleUpperCase("ru-RU") || "AX";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function normalizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Выберите файл изображения."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Размер изображения не должен превышать 8 МБ."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Не удалось прочитать изображение."));
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error("Файл не удалось открыть как изображение."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const sx = (image.naturalWidth - side) / 2;
        const sy = (image.naturalHeight - side) / 2;
        canvas.width = 384;
        canvas.height = 384;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Браузер не смог обработать изображение."));
          return;
        }
        context.drawImage(image, sx, sy, side, side, 0, 0, 384, 384);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileSettings({ user, stats, notificationPreferences }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [savedName, setSavedName] = useState(user.name);
  const [savedImage, setSavedImage] = useState(user.image ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [region, setRegion] = useState("");
  const [notifications, setNotifications] = useState<NotificationPreferences>(notificationPreferences);
  const [savingNotification, setSavingNotification] = useState<keyof NotificationPreferences | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("statistics");
  const initialPhone = user.phone ? (normalizeRussianPhone(user.phone) ?? formatRussianPhoneInput(user.phone)) : "";
  const [phone, setPhone] = useState(initialPhone);
  const [phoneDraft, setPhoneDraft] = useState(initialPhone);
  const [editPhone, setEditPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);

  const hasChanges = name.trim() !== savedName || image !== savedImage || phoneDraft !== phone;
  const avatarText = useMemo(() => initials(name || user.name), [name, user.name]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
      const storedTheme = localStorage.getItem("axion-profile-theme");
      if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "system") setTheme(storedTheme);
      setRegion(localStorage.getItem("axion-profile-region") ?? "");
    } catch {
      // Preferences are optional; the profile itself is loaded from the server.
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const light = theme === "light" || (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
      const root = document.documentElement;
      root.style.setProperty("--background", light ? "#f1f3f5" : "#080b0e");
      root.style.setProperty("--surface", light ? "#ffffff" : "#11171c");
      root.style.setProperty("--header", light ? "#f8f9fa" : "#080b0e");
      root.style.setProperty("--line", light ? "#d3dbe1" : "#303a43");
      root.style.setProperty("--foreground", light ? "#161b20" : "#f5f7f9");
      root.style.setProperty("--muted", light ? "#64717b" : "#9aa6b2");
      root.style.colorScheme = light ? "light" : "dark";
    };
    applyTheme();
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const showNotice = (kind: "success" | "error", text: string) => setNotice({ kind, text });

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length < 2 || nextName.length > 80) {
      showNotice("error", "Имя должно содержать от 2 до 80 символов.");
      return;
    }
    const phoneChanged = phoneDraft !== phone;
    const normalizedPhone = phoneDraft.trim() ? normalizeRussianPhone(phoneDraft) : null;
    if (phoneChanged && phoneDraft.trim() && !normalizedPhone) {
      const message = "Введите номер в формате +7 (XXX) XXX-XX-XX.";
      setPhoneMessage(message);
      showNotice("error", message);
      return;
    }
    if (!hasChanges) {
      showNotice("success", "Нет изменений для сохранения.");
      return;
    }

    setSaving(true);
    setNotice(null);
    setPhoneMessage("");
    try {
      if (phoneChanged) {
        const phoneResponse = await fetch("/api/profile/phone", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone ?? "" }),
        });
        if (!phoneResponse.ok) {
          const body = await phoneResponse.json().catch(() => null) as { error?: string } | null;
          const message = phoneResponse.status === 409
            ? "Этот номер уже используется другим аккаунтом."
            : body?.error === "Invalid phone"
              ? "Введите номер в формате +7 (XXX) XXX-XX-XX."
              : "Не удалось сохранить номер телефона.";
          setPhoneMessage(message);
          showNotice("error", message);
          return;
        }
        setPhone(normalizedPhone ?? "");
        setPhoneDraft(normalizedPhone ?? "");
        setEditPhone(false);
      }

      const result = await authClient.updateUser({ name: nextName, image: image || null });
      if (result.error) {
        showNotice("error", result.error.message || "Не удалось сохранить профиль.");
        return;
      }
      setName(nextName);
      setSavedName(nextName);
      setSavedImage(image);
      showNotice("success", "Изменения профиля сохранены.");
      router.refresh();
    } catch {
      showNotice("error", "Не удалось подключиться к сервису. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const onAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setImage(await normalizeImage(file));
      setNotice(null);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Не удалось обработать изображение.");
    }
  };

  const resetProfile = () => {
    setName(savedName);
    setImage(savedImage);
    setPhoneDraft(phone);
    setPhoneMessage("");
    setEditPhone(false);
    setNotice(null);
  };

  const changeTheme = (value: ThemeMode) => {
    setTheme(value);
    try {
      localStorage.setItem("axion-profile-theme", value);
    } catch {
      showNotice("error", "Браузер не разрешил сохранить настройку темы.");
      return;
    }
    showNotice("success", "Предпочтение темы сохранено в этом браузере.");
  };

  const changeRegion = (value: string) => {
    setRegion(value);
    try {
      if (value) localStorage.setItem("axion-profile-region", value);
      else localStorage.removeItem("axion-profile-region");
      showNotice("success", "Региональное предпочтение сохранено в этом браузере.");
    } catch {
      showNotice("error", "Не удалось сохранить настройку в браузере.");
    }
  };

  const changeNotification = async (key: keyof NotificationPreferences, checked: boolean) => {
    if (savingNotification) return;
    const previous = notifications;
    setNotifications({ ...previous, [key]: checked });
    setSavingNotification(key);
    setNotificationNotice(null);
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });
      const result = await response.json() as NotificationPreferences & { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить настройки уведомлений.");
      setNotifications({ site: result.site, orders: result.orders, messages: result.messages });
      setNotificationNotice({ kind: "success", text: "Настройки уведомлений сохранены." });
    } catch (error) {
      setNotifications(previous);
      setNotificationNotice({ kind: "error", text: error instanceof Error ? error.message : "Не удалось сохранить настройки уведомлений." });
    } finally {
      setSavingNotification(null);
    }
  };


  const signOut = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      showNotice("error", "Не удалось завершить сеанс. Попробуйте ещё раз.");
      setLoggingOut(false);
    }
  };

  const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-70";
  const labelClass = "block text-xs font-medium text-[var(--muted)] sm:text-sm";
  const panelClass = "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5";

  return (
    <main className="mx-auto w-full max-w-[1420px] px-3 py-4 pb-24 sm:px-5 sm:py-8 md:pb-8">
      <div className="mb-5 text-xs text-[var(--muted)] sm:text-sm"><Link href="/" className="transition hover:text-[var(--accent)]">Главная</Link><span className="mx-2">/</span><span className="text-[var(--accent)]">Мой профиль</span></div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Мой профиль</h1><p className="mt-2 text-sm text-[var(--muted)]">Управляйте личными данными и настройками аккаунта.</p></div>
      </div>

      <section className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:mb-5 sm:items-center sm:gap-4 sm:p-5">
        <div className="grid size-[68px] shrink-0 place-items-center overflow-hidden rounded-xl border border-[#46535d] bg-[#202a31] text-xl font-extrabold sm:size-[76px]">
          {image ? <img src={image} alt="Фото профиля" className="size-full object-cover" /> : <span>{avatarText}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words text-base font-extrabold sm:text-xl">{user.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--muted)]">{roleLabels[user.role] ?? "Пользователь"}</span>
            {<span className="text-[var(--muted)]">Email аккаунта</span>}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">На AXION X с {formatDate(user.createdAt)}</p>
        </div>
      </section>

      <div className="grid min-w-0 items-start gap-4 sm:gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 sm:p-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
          <nav aria-label="Разделы профиля" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] lg:grid lg:overflow-visible lg:pb-0 lg:pt-1">
            <ProfileNavButton active={activeTab === "statistics"} onClick={() => setActiveTab("statistics")}><BarChart3 size={17} /> Статистика</ProfileNavButton>
            <ProfileNavButton active={activeTab === "orders"} onClick={() => setActiveTab("orders")}><Package size={17} /> Мои заказы</ProfileNavButton>
            <ProfileNavButton active={activeTab === "partnership"} onClick={() => setActiveTab("partnership")}><Handshake size={17} /> Партнерство</ProfileNavButton>
            <ProfileNavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}><Settings2 size={17} /> Настройки</ProfileNavButton>
          </nav>
          <div className="mt-4 hidden rounded-lg border border-[var(--line)] p-3 lg:block"><div className="flex items-center gap-2 text-sm font-bold"><CircleHelp size={17} className="text-[var(--accent)]" /> Нужна помощь?</div><p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">Если возникли вопросы с доступом к аккаунту, проверьте данные входа или выйдите и войдите снова.</p></div>
          <button type="button" onClick={() => setConfirmLogout(true)} disabled={loggingOut} className="mt-3 hidden min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-60 lg:inline-flex lg:justify-start"><LogOut size={16} /> {loggingOut ? "Выходим…" : "Выйти из аккаунта"}</button>
        </aside>

        <div className="min-w-0">
          {activeTab === "settings" ? <div className="space-y-5">
          <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]"><SlidersHorizontal size={19} /></div><div><h2 className="text-xl font-bold">Настройки профиля</h2><p className="mt-1 text-sm text-[var(--muted)]">Изменяйте данные аккаунта и предпочтения отображения.</p></div></div>

          <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><UserRound size={18} className="text-[var(--accent)]" /><h3 className="font-bold">Личные данные</h3></div>
            <div className="mb-5 flex flex-row items-start gap-3 sm:items-center sm:gap-4">
              <div className="grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-xl border border-[#46535d] bg-[#202a31] text-xl font-extrabold">{image ? <img src={image} alt="Предпросмотр фото профиля" className="size-full object-cover" /> : avatarText}</div>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                <div className="flex w-full flex-row flex-wrap items-center gap-2">
                  <button type="button" onClick={() => fileInput.current?.click()} className="min-h-10 rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs font-bold transition hover:border-[var(--accent)] sm:px-3 sm:text-sm">{image ? "Заменить фото" : "Добавить фото"}</button>
                  {image && <button type="button" onClick={() => setImage("")} className="min-h-10 rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs font-bold text-red-300 transition hover:border-red-400/60 sm:px-3 sm:text-sm">Удалить фото</button>}
                </div>
                <input ref={fileInput} type="file" accept="image/*" onChange={onAvatarSelected} className="hidden" aria-label="Выбрать фотографию профиля" />
                <p className="w-full text-xs leading-relaxed text-[var(--muted)]">Изображение будет обрезано до квадрата и уменьшено перед сохранением.</p>
              </div>
            </div>
            <form onSubmit={saveProfile}>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
                <div><label htmlFor="profile-name" className={labelClass}>Имя и фамилия</label><input id="profile-name" autoComplete="name" maxLength={80} minLength={2} required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></div>
                <div><label htmlFor="profile-email" className={labelClass}>Email</label><input id="profile-email" type="email" autoComplete="email" value={user.email} readOnly aria-readonly="true" className={fieldClass} /></div>
                <div><label htmlFor="profile-phone" className={labelClass}>Телефон</label><input id="profile-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+7 (XXX) XXX-XX-XX" value={phoneDraft} readOnly={!editPhone} onClick={() => { if (!editPhone) { setEditPhone(true); setPhoneMessage(""); } }} onChange={(event) => setPhoneDraft(formatRussianPhoneInput(event.target.value))} className={fieldClass} aria-describedby={phoneMessage ? "profile-phone-error" : undefined} />{phoneMessage && <p id="profile-phone-error" role="alert" className="mt-2 text-xs text-amber-300">{phoneMessage}</p>}</div>
              </div>
              {notice && <p role="status" className={`mt-4 rounded-lg border px-3 py-2.5 text-sm ${notice.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{notice.text}</p>}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="submit" disabled={saving || !hasChanges} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{saving ? "Сохранение…" : <><Check size={17} /> Сохранить изменения</>}</button>
                {hasChanges && <button type="button" onClick={resetProfile} disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--accent)] disabled:opacity-50 sm:w-auto"><X size={16} /> Отменить</button>}
              </div>
            </form>
          </section>

          <section className={panelClass}>
            <div className="mb-2 flex items-center gap-2"><Palette size={18} className="text-[var(--accent)]" /><h3 className="font-bold">Внешний вид</h3></div>
            <SettingRow title="Тема сайта" description="Выберите удобный режим отображения"><select aria-label="Тема сайта" value={theme} onChange={(event) => changeTheme(event.target.value as ThemeMode)} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm sm:max-w-56"><option value="dark">Тёмная</option><option value="light">Светлая</option><option value="system">Системная</option></select></SettingRow>
            <SettingRow title="Регион" description="Региональные предложения и доступность" stackOnMobile><select aria-label="Регион" value={region} onChange={(event) => changeRegion(event.target.value)} className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm sm:max-w-56"><option value="">Не выбран</option><option value="Нижегородская область">Нижегородская область</option><option value="Москва и Московская область">Москва и Московская область</option><option value="Санкт-Петербург и Ленинградская область">Санкт-Петербург и Ленинградская область</option><option value="Другой регион">Другой регион</option></select></SettingRow>
            <p className="mt-3 text-xs text-[var(--muted)]">Предпочтения внешнего вида и региона хранятся в текущем браузере. Они пока не синхронизируются между устройствами.</p>
          </section>

          <section className={panelClass}>
            <div className="mb-2 flex items-center gap-2"><Bell size={18} className="text-[var(--accent)]" /><h3 className="font-bold">Уведомления</h3></div>
            <SettingRow title="Уведомления на сайте" description="Системные события, объявления администрации и важные обновления"><Toggle checked={notifications.site} onChange={(checked) => void changeNotification("site", checked)} label="Уведомления на сайте" disabled={savingNotification !== null} /></SettingRow>
            <SettingRow title="Уведомления о заказах" description="Новые заказы, подтверждение, завершение и отмена"><Toggle checked={notifications.orders} onChange={(checked) => void changeNotification("orders", checked)} label="Уведомления о заказах" disabled={savingNotification !== null} /></SettingRow>
            <SettingRow title="Сообщения и ответы" description="Новые сообщения в чатах и переписке по заказам"><Toggle checked={notifications.messages} onChange={(checked) => void changeNotification("messages", checked)} label="Уведомления о сообщениях" disabled={savingNotification !== null} /></SettingRow>
            <PushNotifications />
            {notificationNotice && <p role="status" className={`mt-3 rounded-lg border px-3 py-2.5 text-sm ${notificationNotice.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>{notificationNotice.text}</p>}
          </section>

          <section className={panelClass}>
            <div className="mb-3 flex items-center gap-2"><LockKeyhole size={18} className="text-[var(--accent)]" /><h3 className="font-bold">Безопасность аккаунта</h3></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3"><div><div className="text-sm font-semibold">Email</div><div className="mt-1 text-xs text-[var(--muted)]">{user.email}</div></div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3"><div><div className="text-sm font-semibold">Телефон</div><div className="mt-1 text-xs text-[var(--muted)]">{phone || "Номер не указан"}</div></div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3"><div><div className="text-sm font-semibold">Пароль</div><div className="mt-1 text-xs text-[var(--muted)]">Пароль хранится и проверяется сервисом авторизации.</div></div><span className="text-xs text-[var(--muted)]">Управление через авторизацию</span></div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3"><div><div className="text-sm font-semibold">Дата регистрации</div><div className="mt-1 text-xs text-[var(--muted)]">Аккаунт создан {formatDate(user.createdAt)}</div></div><Eye size={17} className="text-[var(--muted)]" /></div>
          </section>

          <section className={`${panelClass} lg:hidden`}>
            <div className="mb-2 flex items-center gap-2"><LogOut size={18} className="text-red-300" /><h3 className="font-bold">Выход из аккаунта</h3></div>
            <p className="mb-4 text-sm text-[var(--muted)]">Завершите текущий сеанс на этом устройстве.</p>
            <button type="button" onClick={() => setConfirmLogout(true)} disabled={loggingOut} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"><LogOut size={17} /> {loggingOut ? "Выходим…" : "Выйти из аккаунта"}</button>
          </section>
          </div> : activeTab === "orders" ? <OrdersHistory /> : activeTab === "partnership" ? (
            <section className="space-y-4"><div><h2 className="text-xl font-bold sm:text-2xl">Партнерство</h2><p className="mt-1 text-sm text-[var(--muted)]">Взаимодействие с AXION X и подготовка к размещению объявлений.</p></div><section className={panelClass}><div className="mb-3 flex items-center gap-2"><Handshake size={20} className="text-[var(--accent)]" /><h3 className="font-bold">Взаимодействие с AXION X</h3></div><p className="text-sm leading-relaxed text-[var(--muted)]">В этом разделе будет собрана информация о сотрудничестве с площадкой: условия взаимодействия, требования к объявлениям и подготовка к размещению предложений.</p><div className="mt-4 rounded-lg border border-dashed border-[var(--line)] p-4"><p className="font-bold">Каталог партнёров — в разработке.</p><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Позже здесь появятся правила размещения объявлений, требования к партнёрам и форма подачи заявки. Пока раздел носит информационный характер.</p></div></section></section>
          ) : (
            <section className="space-y-4"><div><h2 className="text-xl font-bold sm:text-2xl">Статистика</h2><p className="mt-1 text-sm text-[var(--muted)]">Показатели, рассчитанные по данным аккаунта и объявлениям в базе.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className={panelClass}><p className="text-xs text-[var(--muted)]">Мои объявления</p><p className="mt-2 text-3xl font-black">{stats.totalListings}</p><p className="mt-1 text-xs text-[var(--muted)]">Всего создано</p></div><div className={panelClass}><p className="text-xs text-[var(--muted)]">Опубликовано</p><p className="mt-2 text-3xl font-black">{stats.publishedListings}</p><p className="mt-1 text-xs text-[var(--muted)]">Статус PUBLISHED</p></div><div className={panelClass}><p className="text-xs text-[var(--muted)]">Добавления в избранное</p><p className="mt-2 text-3xl font-black">{stats.favoritesReceived}</p><p className="mt-1 text-xs text-[var(--muted)]">Для ваших объявлений</p></div></div><section className={panelClass}><h3 className="font-bold">Источник данных</h3><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Показатели загружаются из базы данных: объявления пользователя (listing.createdById), количество опубликованных объявлений (listing.status = PUBLISHED) и события добавления этих объявлений в избранное (listing_favorite_event). Демонстрационные значения удалены.</p></section></section>
          )}
        </div>

        {confirmLogout && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLogout(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-400/10 text-red-300"><LogOut size={19} /></div><div><h2 id="logout-dialog-title" className="text-lg font-bold">Выйти из аккаунта?</h2><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Вы действительно хотите завершить текущий сеанс?</p></div></div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirmLogout(false)} disabled={loggingOut} className="min-h-11 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)] disabled:opacity-60">Отмена</button><button type="button" onClick={() => { setConfirmLogout(false); void signOut(); }} disabled={loggingOut} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"><LogOut size={16} /> {loggingOut ? "Выходим…" : "Выйти"}</button></div>
          </section>
        </div>}
      </div>
    </main>
  );
}

function ProfileNavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-current={active ? "page" : undefined} onClick={onClick} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[var(--accent)]/10 text-[var(--accent)] lg:shadow-[inset_3px_0_var(--accent)]" : "text-[#c8d0d6] hover:bg-white/5 hover:text-white"}`}>{children}</button>;
}

function SettingRow({ title, description, children, stackOnMobile = false }: { title: string; description: string; children: React.ReactNode; stackOnMobile?: boolean }) {
  return <div className={`${stackOnMobile ? "flex flex-col items-stretch sm:flex-row sm:items-center" : "flex flex-row items-center"} justify-between gap-3 border-b border-[var(--line)] py-3 last:border-b-0`}><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-[var(--muted)]">{description}</div></div><div className={`${stackOnMobile ? "w-full sm:w-auto" : "shrink-0"} sm:min-w-56 sm:max-w-[48%]`}>{children}</div></div>;
}

function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <label className={`inline-flex items-center gap-3 ${disabled ? "cursor-wait opacity-60" : "cursor-pointer"}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={label} className="peer sr-only" /><span aria-hidden="true" className={`relative h-6 w-[42px] rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-[#39434b]"}`}><span className={`absolute left-[3px] top-[3px] size-[18px] rounded-full bg-white transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0"}`} /></span><span className="text-xs text-[var(--muted)]">{checked ? "Включено" : "Выключено"}</span></label>;
}
