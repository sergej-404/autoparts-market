import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthorizationRequired } from "@/components/auth/AuthorizationRequired";
import { auth } from "@/lib/auth";
import NotificationsClient from "./NotificationsClient";

export const metadata: Metadata = { title: "Уведомления" };

export default async function NotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AuthorizationRequired />;
  return <NotificationsClient />;
}
