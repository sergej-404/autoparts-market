"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, LoaderCircle } from "lucide-react";

type PushState = "checking" | "unsupported" | "denied" | "enabled" | "disabled" | "busy";

function decodeApplicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function PushNotifications() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      await Promise.resolve();
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setState("unsupported");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!active) return;
        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }
        if (subscription) {
          const response = await fetch("/api/push/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          });
          if (!active) return;
          if (!response.ok) throw new Error("Не удалось синхронизировать Push-подписку с аккаунтом.");
          setState("enabled");
        } else {
          setState("disabled");
        }
      } catch {
        if (active) {
          setState("disabled");
          setMessage("Не удалось проверить Push-подписку этого устройства.");
        }
      }
    };
    void check();
    return () => { active = false; };
  }, []);

  const enable = async () => {
    if (state === "busy") return;
    setState("busy");
    setMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "disabled");
        setMessage(permission === "denied"
          ? "Разрешите уведомления для AXION X в настройках браузера и повторите попытку."
          : "Разрешение на уведомления не предоставлено.");
        return;
      }

      const keyResponse = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
      const keyData = await keyResponse.json() as { publicKey?: string; error?: string };
      if (!keyResponse.ok || !keyData.publicKey) throw new Error(keyData.error || "Push-уведомления не настроены на сервере.");

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const applicationServerKey = decodeApplicationServerKey(keyData.publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription?.options.applicationServerKey) {
        const currentKey = new Uint8Array(subscription.options.applicationServerKey);
        const keyChanged = currentKey.length !== applicationServerKey.length
          || currentKey.some((byte, index) => byte !== applicationServerKey[index]);
        if (keyChanged) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить Push-подписку.");
      setState("enabled");
      setMessage("Push-уведомления включены на этом устройстве.");
    } catch (error) {
      setState(Notification.permission === "denied" ? "denied" : "disabled");
      setMessage(error instanceof Error ? error.message : "Не удалось включить Push-уведомления.");
    }
  };

  const disable = async () => {
    if (state === "busy") return;
    setState("busy");
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error || "Не удалось отключить Push-подписку на сервере.");
        }
        await subscription.unsubscribe();
      }
      setState("disabled");
      setMessage("Push-уведомления отключены на этом устройстве.");
    } catch (error) {
      setState("enabled");
      setMessage(error instanceof Error ? error.message : "Не удалось отключить Push-уведомления.");
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--background)]/40 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {state === "enabled" ? <BellRing size={17} className="text-emerald-400" /> : <BellOff size={17} className="text-[var(--muted)]" />}
            Push-уведомления на этом устройстве
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Получайте уведомления AXION X, даже когда сайт закрыт. Категории регулируются переключателями выше.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void (state === "enabled" ? disable() : enable())}
          disabled={state === "checking" || state === "busy" || state === "unsupported" || state === "denied"}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "busy" || state === "checking" ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {state === "checking" ? "Проверка…" : state === "busy" ? "Сохранение…" : state === "enabled" ? "Отключить на устройстве" : state === "unsupported" ? "Не поддерживается" : state === "denied" ? "Разрешение заблокировано" : "Включить на устройстве"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{message}</p>}
      {state === "denied" && <p className="mt-2 text-xs leading-relaxed text-amber-300">Измените разрешение уведомлений в настройках сайта вашего браузера. После этого обновите страницу.</p>}
      {state === "unsupported" && <p className="mt-2 text-xs leading-relaxed text-amber-300">Этот браузер не поддерживает Web Push. На iPhone/iPad Push доступен для сайта, добавленного на экран «Домой», начиная с iOS/iPadOS 16.4.</p>}
    </div>
  );
}
