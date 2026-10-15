import Link from "next/link";
import { Heart } from "lucide-react";

type Product = { id: string; title: string; price: string; meta: string; location: string };

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/product/${product.id}`} className="block aspect-[4/3] bg-gray-100" aria-label={product.title}>
        <div className="flex h-full items-center justify-center text-sm text-gray-400">Фото запчасти</div>
      </Link>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <Link href={`/product/${product.id}`} className="font-semibold leading-5 hover:text-[var(--accent)]">{product.title}</Link>
          <button type="button" aria-label="Добавить в избранное" className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[var(--accent)]"><Heart size={18} /></button>
        </div>
        <p className="text-sm text-gray-500">{product.meta}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <strong className="text-lg">{product.price}</strong>
          <span className="text-xs text-gray-500">{product.location}</span>
        </div>
      </div>
    </article>
  );
}
