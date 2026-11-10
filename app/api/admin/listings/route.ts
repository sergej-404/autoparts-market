import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ListingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminApiGuard } from "@/lib/admin-api";
import { isAllowedListingImage } from "@/lib/listing-image";

const MAX_DATABASE_INT = 2_147_483_647;

export async function POST(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
  const images = Array.isArray(data.images) && data.images.every(isAllowedListingImage) ? data.images : null;
  const requestedStatus = data.status === "PUBLISHED" ? ListingStatus.PUBLISHED : data.status === "DRAFT" ? ListingStatus.DRAFT : data.status === "OUT_OF_STOCK" ? ListingStatus.OUT_OF_STOCK : null;
  const makeId = typeof data.makeId === "string" && data.makeId ? data.makeId : null;
  const modelId = typeof data.modelId === "string" && data.modelId ? data.modelId : null;
  if (!makeId && (data.modelId !== null && data.modelId !== undefined && data.modelId !== "")) return NextResponse.json({ error: "Выберите марку автомобиля." }, { status: 400 });
  const year = data.year === null || data.year === "" || data.year === undefined ? null : Number(data.year);
  const price = data.price === undefined ? 0 : Number(data.price);
  const quantity = data.quantity === undefined ? 0 : Number(data.quantity);
  const status = requestedStatus === ListingStatus.PUBLISHED && quantity === 0 ? ListingStatus.OUT_OF_STOCK : requestedStatus;

  if (title.length < 3 || title.length > 120 || description.length < 1 || description.length > 10000 ||
      !categoryId || !images || images.length > 10 || !status || !Number.isSafeInteger(price) || price < 0 || price > MAX_DATABASE_INT || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_DATABASE_INT ||
      (year !== null && (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 2)) ||
      ((modelId !== null || year !== null) && !makeId) || (year !== null && !modelId) || (modelId !== null && !makeId)) {
    return NextResponse.json({ error: "Проверьте название, описание, фотографии и характеристики объявления." }, { status: 400 });
  }

  const category = await prisma.productCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return NextResponse.json({ error: "Выбранная категория не найдена." }, { status: 400 });
  if (makeId) {
    const make = await prisma.carMake.findUnique({ where: { id: makeId }, select: { id: true } });
    if (!make) return NextResponse.json({ error: "Выбранная марка не найдена." }, { status: 400 });
  }
  if (modelId && makeId) {
    const model = await prisma.carModel.findFirst({ where: { id: modelId, makeId }, select: { id: true, years: true } });
    if (!model) return NextResponse.json({ error: "Модель не относится к выбранной марке." }, { status: 400 });
    if (year !== null && !model.years.includes(year)) return NextResponse.json({ error: "Год не входит в годы выпуска выбранной модели." }, { status: 400 });
  }

  const rawCompatibility = data.compatibility;
  if (rawCompatibility !== undefined && (!Array.isArray(rawCompatibility) || rawCompatibility.length > 500)) return NextResponse.json({ error: "Некорректный список автомобилей." }, { status: 400 });
  const compatibility: { makeId: string; modelId: string | null; year: number | null }[] = [];
  if (Array.isArray(rawCompatibility)) {
    const compatibilityInput: { makeId: string; modelId: string | null; year: number | null }[] = [];
    for (const value of rawCompatibility) {
      if (!value || typeof value !== "object") return NextResponse.json({ error: "Неверная совместимость автомобиля." }, { status: 400 });
      const row = value as Record<string, unknown>;
      if (
        typeof row.makeId !== "string" ||
        (row.modelId !== null && typeof row.modelId !== "string") ||
        (row.year !== null && (typeof row.year !== "number" || !Number.isInteger(row.year) || row.year < 1886 || row.year > new Date().getFullYear() + 2))
      ) return NextResponse.json({ error: "Неверная совместимость автомобиля." }, { status: 400 });
      compatibilityInput.push({
        makeId: row.makeId,
        modelId: typeof row.modelId === "string" ? row.modelId : null,
        year: typeof row.year === "number" ? row.year : null,
      });
    }

    const makeIds = [...new Set(compatibilityInput.map((item) => item.makeId))];
    const modelIds = [...new Set(compatibilityInput.flatMap((item) => item.modelId ? [item.modelId] : []))];
    const [compatibilityMakes, compatibilityModels] = await Promise.all([
      prisma.carMake.findMany({ where: { id: { in: makeIds } }, select: { id: true } }),
      prisma.carModel.findMany({ where: { id: { in: modelIds } }, select: { id: true, makeId: true, years: true } }),
    ]);
    const existingMakeIds = new Set(compatibilityMakes.map((make) => make.id));
    const modelsById = new Map(compatibilityModels.map((model) => [model.id, model] as const));

    for (const item of compatibilityInput) {
      if (!existingMakeIds.has(item.makeId)) return NextResponse.json({ error: "Марка не найдена." }, { status: 400 });
      if (item.modelId) {
        const model = modelsById.get(item.modelId);
        if (!model || model.makeId !== item.makeId || (item.year !== null && !model.years.includes(item.year))) {
          return NextResponse.json({ error: "Неверная модель или год." }, { status: 400 });
        }
      } else if (item.year !== null) {
        return NextResponse.json({ error: "Укажите модель для выбранного года." }, { status: 400 });
      }
      compatibility.push(item);
    }
  }

  const principal = guard.principal;
  if (!principal) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });

  const listing = await prisma.listing.create({
    data: { title, description, images, categoryId, makeId, modelId, year, compatibility, price, quantity, status, createdById: principal.id },
    include: { make: true, model: true, category: true },
  });
  revalidatePath("/");
  return NextResponse.json({ listing }, { status: 201 });
}


export async function PATCH(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Некорректные данные." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const categoryId = typeof data.categoryId === "string" ? data.categoryId : "";
  const makeId = typeof data.makeId === "string" && data.makeId ? data.makeId : null;
  const modelId = typeof data.modelId === "string" && data.modelId ? data.modelId : null;
  const year = data.year === null || data.year === "" || data.year === undefined ? null : Number(data.year);
  const price = data.price === undefined ? 0 : Number(data.price);
  const quantity = data.quantity === undefined ? 0 : Number(data.quantity);
  const requestedStatus = data.status === "PUBLISHED" ? ListingStatus.PUBLISHED : data.status === "DRAFT" ? ListingStatus.DRAFT : data.status === "OUT_OF_STOCK" ? ListingStatus.OUT_OF_STOCK : null;
  const status = requestedStatus === ListingStatus.PUBLISHED && quantity === 0 ? ListingStatus.OUT_OF_STOCK : requestedStatus;
  const images = Array.isArray(data.images) && data.images.every(isAllowedListingImage) ? data.images : null;
  if (!id || !images || images.length > 10 || title.length < 3 || title.length > 120 || description.length < 1 || description.length > 10000 || !categoryId || !status || !Number.isSafeInteger(price) || price < 0 || price > MAX_DATABASE_INT || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_DATABASE_INT || (year !== null && (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 2)) || ((modelId !== null || year !== null) && !makeId) || (year !== null && !modelId)) return NextResponse.json({ error: "Проверьте название, описание, категорию, автомобиль и статус." }, { status: 400 });
  const category = await prisma.productCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) return NextResponse.json({ error: "Выбранная категория не найдена." }, { status: 400 });
  if (makeId) {
    const make = await prisma.carMake.findUnique({ where: { id: makeId }, select: { id: true } });
    if (!make) return NextResponse.json({ error: "Марка автомобиля не найдена." }, { status: 400 });
  }
  if (modelId && makeId) {
    const model = await prisma.carModel.findFirst({ where: { id: modelId, makeId }, select: { id: true, years: true } });
    if (!model || (year !== null && !model.years.includes(year))) return NextResponse.json({ error: "Проверьте модель и год выпуска." }, { status: 400 });
  }
  // The edit form exposes one make/model/year combination. Do not silently keep
  // compatibility metadata from the previous vehicle after changing those fields.
  const previous = await prisma.listing.findUnique({ where: { id }, select: { makeId: true, modelId: true, year: true, compatibility: true } });
  if (!previous) return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });
  const vehicleChanged = previous.makeId !== makeId || previous.modelId !== modelId || previous.year !== year;
  const compatibility = vehicleChanged ? (makeId ? [{ makeId, modelId, year }] : []) : previous.compatibility === null ? Prisma.JsonNull : previous.compatibility;
  try {
    const listing = await prisma.$transaction(async (tx) => tx.listing.update({ where: { id }, data: { title, description, images, categoryId, status, makeId, modelId, year, compatibility, price, quantity }, include: { make: true, model: true, category: true } }), { isolationLevel: "Serializable" });
    revalidatePath("/");
    return NextResponse.json({ listing });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const guard = await adminApiGuard();
  if (guard.response) return guard.response;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).id !== "string") {
    return NextResponse.json({ error: "Не указан идентификатор объявления." }, { status: 400 });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const listingId = (body as { id: string }).id;
      const activeOrders = await tx.orderItem.count({
        where: { listingId, order: { status: { in: ["PENDING", "APPROVED"] } } },
      });
      if (activeOrders > 0) throw new Error("ACTIVE_ORDERS");
      await tx.listing.delete({ where: { id: listingId } });
    }, { isolationLevel: "Serializable" });
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_ORDERS") return NextResponse.json({ error: "Нельзя удалить объявление с незавершёнными заказами." }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return NextResponse.json({ error: "Данные объявления изменились. Повторите действие." }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });
    throw error;
  }
}
