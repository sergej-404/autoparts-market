import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/web-push";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push-уведомления пока не настроены на сервере." }, { status: 503 });
  }
  return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
