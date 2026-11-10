import { NextResponse } from "next/server";
import { getCurrentPrincipal } from "@/lib/authorization";

export async function adminApiGuard() {
  const principal = await getCurrentPrincipal();
  if (!principal) {
    return { principal: null, response: NextResponse.json({ error: "Требуется авторизация." }, { status: 401 }) };
  }
  if (principal.role !== "ADMIN") {
    return { principal: null, response: NextResponse.json({ error: "Доступ запрещён." }, { status: 403 }) };
  }
  return { principal, response: null };
}
