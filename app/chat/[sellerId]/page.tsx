import type { Metadata } from "next";
import { ChatClient } from "../ChatClient";

export const metadata: Metadata = { title: "Чат с продавцом" };

export default function SellerChatPage() {
  return <ChatClient />;
}
