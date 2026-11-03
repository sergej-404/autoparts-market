import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRussianPhone } from "@/lib/phone";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("phone" in body) || typeof body.phone !== "string") {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }
  const rawPhone = body.phone.trim();
  const phone = rawPhone ? normalizeRussianPhone(rawPhone) : null;
  if (rawPhone && !phone) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  try {
    if (phone) {
      const otherPhones = await prisma.user.findMany({
        where: { id: { not: session.user.id }, phone: { not: null } },
        select: { phone: true },
      });
      if (otherPhones.some((entry) => entry.phone && normalizeRussianPhone(entry.phone) === phone)) {
        return NextResponse.json({ error: "Phone already in use" }, { status: 409 });
      }
    }
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
