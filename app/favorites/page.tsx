import type { Metadata } from "next";
import FavoritesClient from "@/app/favorites/FavoritesClient";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохранённые товары в избранном AXION X.",
};

export default function Page() {
  return <FavoritesClient />;
}
