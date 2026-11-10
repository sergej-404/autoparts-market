import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin-api";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_PATH = /^listings\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = await request.json() as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос загрузки." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Хранилище фотографий не настроено. Добавьте BLOB_READ_WRITE_TOKEN." }, { status: 503 });
  }

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const guard = await adminApiGuard();
        if (guard.response) {
          throw new Error(guard.response.status === 401 ? "UPLOAD_UNAUTHORIZED" : "UPLOAD_FORBIDDEN");
        }
        if (!ALLOWED_PATH.test(pathname)) {
          throw new Error("UPLOAD_INVALID_PATH");
        }

        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        };
      },
      onUploadCompleted: async () => {
        // The listing URL is persisted only when the administrator saves the listing.
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UPLOAD_UNAUTHORIZED") return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
    if (message === "UPLOAD_FORBIDDEN") return NextResponse.json({ error: "Доступ запрещён." }, { status: 403 });
    if (message === "UPLOAD_INVALID_PATH") return NextResponse.json({ error: "Некорректное имя файла." }, { status: 400 });
    console.error("Admin Blob upload failed", error);
    return NextResponse.json({ error: "Не удалось подготовить загрузку фотографии." }, { status: 500 });
  }
}
