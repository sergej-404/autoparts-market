"use client";
import { useRef } from "react";
import { ListingCard, type PublicListing } from "@/components/cards/ListingCard";

export default function SimilarProducts({ items, title = "Похожее" }: { items: PublicListing[]; title?: string }) {
  const track = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  const scroll = (direction: number) => {
    const element = track.current;
    const card = element?.firstElementChild as HTMLElement | null;
    if (!element || !card) return;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap || "0") || 0;
    element.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };
  const arrow = (direction: number, label: string, symbol: string) => <button type="button" onClick={() => scroll(direction)} aria-label={label} className="hidden h-24 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xl font-bold transition hover:border-[var(--accent)] md:flex">{symbol}</button>;
  return <section className="mt-12"><h2 className="mb-5 text-2xl font-black">{title}</h2><div className="flex items-center gap-2">{arrow(-1, "Предыдущий товар", "‹")}<div ref={track} className="flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] sm:gap-4">{items.map(item => <div key={item.id} className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)]"><ListingCard listing={item} compact /></div>)}</div>{arrow(1, "Следующий товар", "›")}</div></section>;
}
