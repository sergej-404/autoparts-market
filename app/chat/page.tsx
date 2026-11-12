import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { AuthorizationRequired } from "@/components/auth/AuthorizationRequired";
import { ChatClient } from "./ChatClient";

export const metadata: Metadata = { title: "Сообщения" };

export default async function ChatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AuthorizationRequired />;

  return (
    <Suspense fallback={<main className="min-h-[50vh]" aria-busy="true" />}>
      <ChatClient />
    </Suspense>
  );
}
