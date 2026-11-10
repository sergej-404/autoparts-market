import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminApiGuard } from "@/lib/admin-api";
import { isAllowedListingImage } from "@/lib/listing-image";

function invalidatePublicCatalogCache() {
  revalidateTag("public-catalog-categories", "max");
  revalidateTag("public-catalog-makes", "max");
}

export async function GET() {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;

  const [makes, categories, listings] = await Promise.all([
    prisma.carMake.findMany({ include: { models: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.listing.findMany({ include: { make: true, model: true, category: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);
  const visibleListings = listings.map((listing) => ({ ...listing, images: listing.images.filter(isAllowedListingImage) }));
  return NextResponse.json({ makes, categories, listings: visibleListings });
}

export async function POST(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;

  if (data.kind === "category") {
    if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.trim().length > 80 || (data.emoji !== undefined && data.emoji !== null && (typeof data.emoji !== "string" || [...data.emoji].length > 8))) {
      return NextResponse.json({ error: "Проверьте название категории и эмодзи." }, { status: 400 });
    }
    try {
      const category = await prisma.productCategory.create({ data: { name: data.name.trim(), emoji: typeof data.emoji === "string" && data.emoji.trim() ? data.emoji.trim() : null } });
      invalidatePublicCatalogCache();
      return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        return NextResponse.json({ error: "Такая категория уже существует." }, { status: 409 });
      }
      throw error;
    }
  }

  if (data.kind === "make") {
    if (typeof data.makeName !== "string" || data.makeName.trim().length < 2 || data.makeName.trim().length > 80 ||
        typeof data.modelName !== "string" || data.modelName.trim().length < 1 || data.modelName.trim().length > 80 ||
        !Array.isArray(data.years) || data.years.length < 1 || data.years.length > 100 ||
        !data.years.every((year) => Number.isInteger(year) && year >= 1886 && year <= new Date().getFullYear() + 2)) {
      return NextResponse.json({ error: "Проверьте марку, модель и список годов выпуска." }, { status: 400 });
    }
    const years = [...new Set(data.years as number[])].sort((a, b) => a - b);
    try {
      const make = await prisma.carMake.upsert({
        where: { name: data.makeName.trim() },
        create: { name: data.makeName.trim() },
        update: {},
      });
      const model = await prisma.carModel.upsert({
        where: { makeId_name: { makeId: make.id, name: data.modelName.trim() } },
        create: { makeId: make.id, name: data.modelName.trim(), years },
        update: { years },
      });
      invalidatePublicCatalogCache();
      return NextResponse.json({ make, model }, { status: 201 });
    } catch (error) {
      throw error;
    }
  }

  return NextResponse.json({ error: "Неизвестный тип данных." }, { status: 400 });
}


export async function PATCH(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) return NextResponse.json({ error: "Не указан идентификатор записи." }, { status: 400 });
  if (data.kind === "category" || data.kind === "make" || data.kind === "model") {
    if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.trim().length > 80) return NextResponse.json({ error: "Название должно содержать от 2 до 80 символов." }, { status: 400 });
    try {
      if (data.kind === "category") {
        if (data.emoji !== undefined && data.emoji !== null && (typeof data.emoji !== "string" || [...data.emoji].length > 8)) return NextResponse.json({ error: "Некорректное эмодзи." }, { status: 400 });
        const category = await prisma.productCategory.update({ where: { id }, data: { name: data.name.trim(), ...(data.emoji !== undefined ? { emoji: typeof data.emoji === "string" && data.emoji.trim() ? data.emoji.trim() : null } : {}) } });
        invalidatePublicCatalogCache();
        return NextResponse.json({ category });
      }
      if (data.kind === "make") {
        const make = await prisma.carMake.update({ where: { id }, data: { name: data.name.trim() } });
        invalidatePublicCatalogCache();
        return NextResponse.json({ make });
      }
      if (!Array.isArray(data.years) || !data.years.every((year) => Number.isInteger(year) && year >= 1886 && year <= new Date().getFullYear() + 2)) return NextResponse.json({ error: "Укажите корректные годы выпуска." }, { status: 400 });
      const model = await prisma.carModel.update({ where: { id }, data: { name: data.name.trim(), years: [...new Set(data.years as number[])].sort((a, b) => a - b) } });
      invalidatePublicCatalogCache();
      return NextResponse.json({ model });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Запись с таким названием уже существует." }, { status: 409 });
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Запись не найдена." }, { status: 404 });
      throw error;
    }
  }
  return NextResponse.json({ error: "Неизвестный тип записи." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : "";
  const kind = data.kind;
  if (!id || !["category", "make", "model"].includes(String(kind))) return NextResponse.json({ error: "Не указана запись для удаления." }, { status: 400 });
  try {
    if (kind === "category") {
      const count = await prisma.listing.count({ where: { categoryId: id } });
      if (count) return NextResponse.json({ error: "Нельзя удалить категорию, пока к ней привязаны объявления." }, { status: 409 });
      await prisma.productCategory.delete({ where: { id } });
    } else if (kind === "make") {
      await prisma.carMake.delete({ where: { id } });
    } else {
      await prisma.carModel.delete({ where: { id } });
    }
    invalidatePublicCatalogCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Запись не найдена." }, { status: 404 });
    throw error;
  }
}
