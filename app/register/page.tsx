import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Регистрация" };

export default function Page() {
  return <AuthPage />;
}
