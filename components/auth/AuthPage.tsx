"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Tab = "login" | "register";

function getAuthErrorMessage(
  code: string | null | undefined,
  message: string | null | undefined,
  action: Tab,
) {
  const normalized = `${code ?? ""} ${message ?? ""}`.toLowerCase();

  if (action === "register" && (
    normalized.includes("user_already_exists") ||
    normalized.includes("email already exists") ||
    normalized.includes("already exists") ||
    normalized.includes("already registered") ||
    normalized.includes("duplicate")
  )) {
    return "Пользователь с таким адресом электронной почты уже зарегистрирован.";
  }

  if (action === "login" && (
    normalized.includes("invalid_email_or_password") ||
    normalized.includes("invalid password") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("credential") ||
    normalized.includes("unauthorized")
  )) {
    return "Неверный адрес электронной почты или пароль.";
  }

  if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  }

  if (normalized.includes("invalid email")) {
    return "Проверьте правильность адреса электронной почты.";
  }

  return action === "login"
    ? "Не удалось войти. Проверьте email и пароль и попробуйте снова."
    : "Не удалось создать аккаунт. Проверьте введённые данные и попробуйте снова.";
}

export function AuthPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(pathname === "/register" ? "register" : "login");
  const [helpOpen, setHelpOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [registerPending, setRegisterPending] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveTab(pathname === "/register" ? "register" : "login");
  }, [pathname]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [helpOpen]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(tab === "login" ? "/login" : "/register", { scroll: false });
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    try {
      const result = await authClient.signIn.email({ email, password, rememberMe: form.get("remember") === "on", callbackURL: "/" });
      if (result.error) {
        setLoginError(getAuthErrorMessage(result.error.code, result.error.message, "login"));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setLoginError("Не удалось подключиться к сервису авторизации. Проверьте настройки базы данных и попробуйте снова.");
    } finally {
      setLoginPending(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError("");
    setRegisterPending(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const phone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const result = await authClient.signUp.email({ email, password, name, phone, callbackURL: "/" });
      if (result.error) {
        setRegisterError(getAuthErrorMessage(result.error.code, result.error.message, "register"));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setRegisterError("Не удалось подключиться к сервису авторизации. Проверьте настройки базы данных и попробуйте снова.");
    } finally {
      setRegisterPending(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else router.push("/");
  };

  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (dx < 0 && activeTab === "login") switchTab("register");
    if (dx > 0 && activeTab === "register") switchTab("login");
  };

  const inputClass = "h-9 w-full rounded-lg border border-[#303a43] bg-[#10161b] px-3 text-sm text-white outline-none transition placeholder:text-[#78848e] focus:border-[#ff6500] focus:ring-1 focus:ring-[#ff6500]/30";
  const labelClass = "mb-1 block text-xs font-medium text-[#d9dfe4] sm:text-sm";
  const primaryButton = "flex min-h-9 w-full items-center justify-center rounded-xl bg-[#ff6500] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e85b00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8b42]";

  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#080b0e] px-2 py-2 text-white sm:px-4">
      <section className="flex max-h-[calc(100dvh-3.5rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-[#ff6500]/80 bg-[#090d10] shadow-[0_0_28px_rgba(255,101,0,0.07)]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#ff6500]/25 px-3 sm:h-16 sm:px-5">
          <a href="/" aria-label="AXION X — главная" className="flex h-full max-w-[75%] items-center">
            <img src="/brand/Menu_1_cloy_pc.png" alt="AXION X" className="max-h-[46px] w-auto max-w-full object-contain object-left sm:max-h-[54px]" />
          </a>
          <button type="button" onClick={() => setHelpOpen(true)} aria-label="Помощь по входу и регистрации" title="Помощь" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ff6500]/60 text-lg font-bold text-[#ff8b42] transition hover:bg-[#ff6500]/10 focus-visible:outline-2 focus-visible:outline-[#ff6500]">?</button>
        </header>

        <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pt-2 sm:px-5 lg:hidden" role="tablist" aria-label="Вход или регистрация">
          <button type="button" role="tab" aria-selected={activeTab === "login"} onClick={() => switchTab("login")} className={`min-h-9 rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${activeTab === "login" ? "border-[#ff6500] bg-[#ff6500]/10 text-[#ff9b5b]" : "border-[#303a43] bg-[#10161b] text-[#aab4bc] hover:border-[#ff6500]/50"}`}>Войти</button>
          <button type="button" role="tab" aria-selected={activeTab === "register"} onClick={() => switchTab("register")} className={`min-h-9 rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${activeTab === "register" ? "border-[#ff6500] bg-[#ff6500]/10 text-[#ff9b5b]" : "border-[#303a43] bg-[#10161b] text-[#aab4bc] hover:border-[#ff6500]/50"}`}>Регистрация</button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden p-2 sm:p-3 lg:grid-cols-2 lg:gap-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <section aria-label="Вход" className={`min-h-0 min-w-0 rounded-xl border border-[#ff6500]/35 p-3 sm:p-4 ${activeTab === "login" ? "block" : "hidden lg:block"}`}>
            <h1 className="text-center text-lg font-bold text-white sm:text-xl">Вход</h1>
            <p className="mt-1 text-center text-xs leading-snug text-[#9aa6b2] sm:text-sm">С возвращением! Войдите в свой аккаунт.</p>
            <form className="mt-3 space-y-2.5" onSubmit={handleLogin}>
              <div><label htmlFor="login-identity" className={labelClass}>Email</label><input id="login-identity" name="email" type="email" autoComplete="username" required placeholder="Введите email" className={inputClass} /></div>
              <div><label htmlFor="login-password" className={labelClass}>Пароль</label><div className="relative"><input id="login-password" name="password" type={showLoginPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Введите пароль" className={`${inputClass} pr-12`} /><button type="button" aria-label={showLoginPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowLoginPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#9aa6b2] hover:text-[#ff9b5b]">{showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#c1c9cf]"><input type="checkbox" name="remember" className="size-4 accent-[#ff6500]" />Запомнить меня</label>
              {loginError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{loginError}</p>}
              <button type="submit" disabled={loginPending} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>{loginPending ? "Входим…" : "Войти"}</button>
              <button type="button" onClick={() => setHelpOpen(true)} className="block w-full text-center text-sm text-[#ff9b5b] hover:text-[#ffb47f]">Забыли пароль?</button>
            </form>
            <div className="mt-3 border-t border-[#303a43]/80 pt-2.5 text-center text-xs text-[#9aa6b2] sm:text-sm">Нет аккаунта? <button type="button" onClick={() => switchTab("register")} className="font-semibold text-[#ff9b5b] hover:underline">Зарегистрируйтесь</button></div>
          </section>

          <section aria-label="Регистрация" className={`min-h-0 min-w-0 rounded-xl border border-[#ff6500]/35 p-3 sm:p-4 ${activeTab === "register" ? "block" : "hidden lg:block"}`}>
            <h2 className="text-center text-lg font-bold text-white sm:text-xl">Регистрация</h2>
            <p className="mt-1 text-center text-xs leading-snug text-[#9aa6b2] sm:text-sm">Создайте аккаунт и получите доступ к возможностям AXION X.</p>
            <form className="mt-3 space-y-2" onSubmit={handleRegister}>
              <div><label htmlFor="register-name" className={labelClass}>Имя</label><input id="register-name" name="name" autoComplete="name" required minLength={2} placeholder="Ваше имя" className={inputClass} /></div>
              <div><label htmlFor="register-email" className={labelClass}>Email</label><input id="register-email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" className={inputClass} /></div>
              <div><label htmlFor="register-phone" className={labelClass}>Телефон</label><input id="register-phone" name="phone" type="tel" autoComplete="tel" required placeholder="+7 ..." className={inputClass} /></div>
              <div><label htmlFor="register-password" className={labelClass}>Пароль</label><div className="relative"><input id="register-password" name="password" type={showRegisterPassword ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} placeholder="Не менее 12 символов" className={`${inputClass} pr-12`} /><button type="button" aria-label={showRegisterPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowRegisterPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#9aa6b2] hover:text-[#ff9b5b]">{showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="mt-0.5 text-[11px] text-[#7f8b94]">Минимум 12 символов.</p></div>
              <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-[#aeb8c0]"><input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-[#ff6500]" /><span>Я согласен с условиями пользовательского соглашения и политикой конфиденциальности.</span></label>
              {registerError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{registerError}</p>}
              <button type="submit" disabled={registerPending} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>{registerPending ? "Создаём аккаунт…" : "Зарегистрироваться"}</button>
            </form>
            <div className="mt-3 border-t border-[#303a43]/80 pt-2.5 text-center text-xs text-[#9aa6b2] sm:text-sm">Уже есть аккаунт? <button type="button" onClick={() => switchTab("login")} className="font-semibold text-[#ff9b5b] hover:underline">Войти</button></div>
          </section>
        </div>
      </section>

      <button type="button" onClick={goBack} className="mt-2 inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#303a43] px-4 py-1.5 text-xs text-[#aeb8c0] sm:text-sm transition hover:border-[#ff6500]/60 hover:text-white"><ArrowLeft size={16} />Вернуться назад</button>

      {helpOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="auth-help-title" className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#ff6500]/70 bg-[#0b1014] p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 id="auth-help-title" className="text-xl font-bold">Помощь: вход и регистрация</h2><p className="mt-1 text-sm text-[#9aa6b2]">Краткая инструкция по работе с аккаунтом</p></div><button type="button" aria-label="Закрыть окно помощи" onClick={() => setHelpOpen(false)} className="rounded-lg p-2 text-[#9aa6b2] hover:bg-white/5 hover:text-white"><X size={20} /></button></div>
          <div className="mt-5 space-y-5 text-sm leading-relaxed text-[#c0c9cf]"><div><h3 className="font-semibold text-[#ff9b5b]">Как войти</h3><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Введите email, указанный при регистрации.</li><li>Введите пароль и при необходимости отметьте «Запомнить меня».</li><li>Нажмите «Войти».</li></ol></div><div><h3 className="font-semibold text-[#ff9b5b]">Как зарегистрироваться</h3><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Заполните имя, email и телефон.</li><li>Придумайте пароль длиной не менее 8 символов.</li><li>Прочитайте и подтвердите согласие с условиями.</li><li>Нажмите «Зарегистрироваться».</li></ol></div><div><h3 className="font-semibold text-[#ff9b5b]">Правила пароля</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li>Минимум 12 символов.</li><li>Не используйте очевидные пароли и данные, которые легко угадать.</li><li>Не сообщайте пароль другим людям.</li></ul></div><p className="rounded-lg border border-[#303a43] bg-[#10161b] p-3 text-xs text-[#8f9ba4]">Регистрация и вход подключаются к серверу. Подтверждение email и восстановление пароля будут добавлены отдельным этапом.</p></div>
          <button type="button" onClick={() => setHelpOpen(false)} className={`${primaryButton} mt-5`}>Понятно</button>
        </section>
      </div>}
    </main>
  );
}
