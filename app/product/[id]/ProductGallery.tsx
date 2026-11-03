"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const step = (direction: number) => setIndex(current => (current + direction + images.length) % images.length);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowRight") step(1); if (event.key === "ArrowLeft") step(-1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);
  if (!images.length) return <div className="flex aspect-square items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]">Фотографии не добавлены</div>;
  return <>
    <div className="flex flex-col gap-3 md:relative md:min-w-0 md:pl-24">
      <div className="relative min-w-0 w-full aspect-square overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <Image src={images[index]} alt={`${title}, фото ${index + 1}`} fill priority sizes="(max-width: 768px) 100vw, 45vw" className="object-contain" />
        <button type="button" aria-label="Предыдущее фото" onClick={() => step(-1)} className="absolute inset-y-0 left-0 z-10 w-1/4 flex items-center justify-start pl-3 text-2xl md:hidden" />
        <button type="button" aria-label="Следующее фото" onClick={() => step(1)} className="absolute inset-y-0 right-0 z-10 w-1/4 flex items-center justify-end pr-3 text-2xl md:hidden" />
        <button type="button" aria-label="Открыть фото" onClick={() => setOpen(true)} className="absolute inset-y-0 left-1/4 z-10 w-1/2" />
        {images.length > 1 && <><button type="button" onClick={() => step(-1)} aria-label="Предыдущее фото" className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 flex size-10 items-center justify-center rounded-lg bg-black/60 text-2xl leading-none text-white md:flex">‹</button><button type="button" onClick={() => step(1)} aria-label="Следующее фото" className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex size-10 items-center justify-center rounded-lg bg-black/60 text-2xl leading-none text-white md:flex">›</button></>}
      </div>
      <div className="flex max-w-full min-w-0 gap-2 overflow-x-auto pb-2 md:absolute md:inset-y-0 md:left-0 md:w-20 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pb-0" style={{ scrollbarWidth: "thin" }}>
        {images.map((src, i) => <button type="button" key={`${src}-${i}`} onClick={() => setIndex(i)} aria-label={`Фото ${i + 1}`} aria-pressed={index === i} className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 md:w-full ${index === i ? "border-blue-500" : "border-[var(--line)]"}`}><Image src={src} alt={`Миниатюра ${i + 1}`} fill sizes="80px" className="object-contain" /></button>)}
      </div>
    </div>
    {open && <div role="dialog" aria-modal="true" aria-label="Просмотр фотографий" className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"><div className="flex items-center justify-between px-5 py-3"><span>{index + 1} / {images.length}</span><div className="flex gap-3"><button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">✕</button></div></div><div className="relative min-h-0 flex-1 overflow-auto"><Image src={images[index]} alt={`${title}, фото ${index + 1}`} fill sizes="100vw" className="object-contain" unoptimized /></div><div className="flex justify-center gap-6 py-4"><button type="button" onClick={() => step(-1)}>← Предыдущее</button><button type="button" onClick={() => step(1)}>Следующее →</button></div></div>}
  </>;
}
