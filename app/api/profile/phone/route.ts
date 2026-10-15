import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("phone" in body) || typeof body.phone !== "string") {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }
  const phone = body.phone.trim();
  if (!/^\+?[0-9 ()-]{5,32}$/.test(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { phone } });
    return NextResponse.json({ phone });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Phone already in use" }, { status: 409 });
    }
    console.error("Profile phone update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
