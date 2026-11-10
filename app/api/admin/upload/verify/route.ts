import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin-api";
import { isAllowedListingImage } from "@/lib/listing-image";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const expectedTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function hasValidSignature(extension: string, bytes: Buffer): boolean {
  if (extension === "jpg") {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === "png") {
    return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (extension === "webp") {
    return bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export async function POST(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос проверки фотографии." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !isAllowedListingImage((body as Record<string, unknown>).url)) {
    return NextResponse.json({ error: "Некорректная ссылка на фотографию." }, { status: 400 });
  }

  const url = (body as { url: string }).url;
  const extension = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  const expectedType = expectedTypes[extension];
  if (!expectedType) return NextResponse.json({ error: "Неподдерживаемый формат фотографии." }, { status: 400 });

  try {
    const imageResponse = await fetch(url, { cache: "no-store", redirect: "error" });
    if (!imageResponse.ok) return NextResponse.json({ error: "Не удалось проверить загруженную фотографию." }, { status: 502 });

    const contentType = imageResponse.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType !== expectedType) {
      await del(url);
      return NextResponse.json({ error: "Содержимое файла не соответствует формату фотографии." }, { status: 400 });
    }

    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (bytes.length < 1 || bytes.length > MAX_FILE_SIZE || !hasValidSignature(extension, bytes)) {
      await del(url);
      return NextResponse.json({ error: "Файл не является корректным изображением или превышает 8 МБ." }, { status: 400 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Admin Blob image verification failed", error);
    return NextResponse.json({ error: "Не удалось проверить фотографию." }, { status: 502 });
  }
}
