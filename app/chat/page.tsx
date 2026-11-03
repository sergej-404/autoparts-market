import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatClient } from "./ChatClient";

export const metadata: Metadata = { title: "Сообщения" };

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="min-h-[50vh]" aria-busy="true" />}>
      <ChatClient />
    </Suspense>
  );
}
