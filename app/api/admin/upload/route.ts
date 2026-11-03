import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin-api";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const imageTypes = new Map<string, { extension: string; signature: (bytes: Buffer) => boolean }>([
  ["image/jpeg", { extension: "jpg", signature: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ["image/png", { extension: "png", signature: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }],
  ["image/webp", { extension: "webp", signature: (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" }],
]);

export async function POST(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан." }, { status: 400 });
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Размер фотографии должен быть не больше 8 МБ." }, { status: 400 });
  const type = imageTypes.get(file.type);
  if (!type) return NextResponse.json({ error: "Поддерживаются фотографии JPEG, PNG и WebP." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!type.signature(bytes)) return NextResponse.json({ error: "Содержимое файла не соответствует типу изображения." }, { status: 400 });

  const uploadDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${type.extension}`;
  await writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx" });
  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
