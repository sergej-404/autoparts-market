import Image from "next/image";

export const categoryIconOptions = [
  ["ax:01", "Автомобиль"], ["ax:02", "Фара"], ["ax:03", "Противотуманная фара"],
  ["ax:04", "Задний фонарь"], ["ax:05", "Галогенная лампа"],
  ["ax:06", "Ближний свет"], ["ax:07", "Дальний свет"],
  ["ax:08", "Противотуманный свет"], ["ax:09", "Аварийный сигнал"],
  ["ax:10", "Дневные ходовые огни"], ["ax:11", "LED-лампы"],
  ["ax:12", "Ксеноновая лампа"], ["ax:13", "LED"],
  ["ax:14", "Указатели поворота"], ["ax:15", "Светодиодная балка"],
  ["ax:16", "Проблесковый маячок"]
] as const;

export function CategoryIcon({ value, size = 48 }: { value: string | null | undefined; size?: number }) {
  const match = /^ax:(0[1-9]|1[0-6])$/.exec(value ?? "");
  if (!match) return <span aria-hidden="true">{value || "🔧"}</span>;
  return <Image src={`/category-icons/${match[1]}.webp`} alt="" width={size} height={size} unoptimized className="object-contain" />;
}
