import { requireRole } from "@/lib/authorization";
import { AdminPanel } from "./AdminPanel";

export const metadata = { title: "Панель администрации | AXION X" };

export default async function AdminPage() {
  await requireRole("ADMIN");
  return <AdminPanel />;
}
