import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Вход и регистрация" };

export default function Page() {
  return <AuthPage />;
}
