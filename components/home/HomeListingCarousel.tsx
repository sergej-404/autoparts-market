"use client";
import { useRef } from "react";
import { ListingCard, type PublicListing } from "@/components/cards/ListingCard";
export function HomeListingCarousel({ listings, label }: { listings: PublicListing[]; label: string }) {
 const track=useRef<HTMLDivElement>(null);
 const move=(direction:number)=>{const el=track.current;const card=el?.firstElementChild as HTMLElement|null;if(!el||!card)return;const gap=parseFloat(getComputedStyle(el).columnGap)||0;el.scrollBy({left:direction*(card.getBoundingClientRect().width+gap),behavior:"smooth"});};
 const arrow=(direction:number,symbol:string,name:string)=><button type="button" onClick={()=>move(direction)} aria-label={`${name}: ${label}`} className="hidden h-24 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xl font-bold transition hover:border-[var(--accent)] md:flex">{symbol}</button>;
 return <div className="mt-6 flex items-center gap-2">{arrow(-1,"‹","Предыдущий товар")}<div ref={track} aria-label={label} className="flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] sm:gap-4">{listings.map(item=><div key={item.id} className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)]"><ListingCard listing={item} compact /></div>)}</div>{arrow(1,"›","Следующий товар")}</div>;
}
