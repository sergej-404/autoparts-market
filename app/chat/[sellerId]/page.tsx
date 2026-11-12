import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AuthorizationRequired } from "@/components/auth/AuthorizationRequired";
import { ChatClient } from "../ChatClient";

export const metadata: Metadata = { title: "Чат с продавцом" };

export default async function SellerChatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AuthorizationRequired />;
  return <ChatClient />;
}
