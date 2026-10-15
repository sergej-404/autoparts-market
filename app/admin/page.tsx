import { requireRole } from "@/lib/authorization";

export default async function Page() {
  await requireRole("ADMIN");

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <h1 className="text-3xl font-black">Панель администратора</h1>
      <p className="mt-3 text-gray-500">Защищённый раздел. Интерфейс инструментов будет спроектирован отдельно.</p>
    </main>
  );
}
