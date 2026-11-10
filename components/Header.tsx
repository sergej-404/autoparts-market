import Link from "next/link";
import { Bell, Heart, MessageCircle, Search, UserRound } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5">
        <Link href="/" className="shrink-0 text-xl font-black tracking-tight">
          Auto<span className="text-[var(--accent)]">Parts</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/catalog" className="hover:text-[var(--accent)]">Каталог</Link>
          <Link href="/favorites" className="hover:text-[var(--accent)]">Избранное</Link>
          <Link href="/chat" className="hover:text-[var(--accent)]">Сообщения</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/notifications" aria-label="Уведомления" className="rounded-xl p-2 hover:bg-gray-100"><Bell size={19} /></Link>
          <Link href="/favorites" aria-label="Избранное" className="rounded-xl p-2 hover:bg-gray-100"><Heart size={19} /></Link>
          <Link href="/profile/settings" aria-label="Профиль" className="rounded-xl p-2 hover:bg-gray-100"><UserRound size={19} /></Link>
          <Link href="/login" className="ml-1 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Войти</Link>
        </div>
      </div>
    </header>
  );
}
