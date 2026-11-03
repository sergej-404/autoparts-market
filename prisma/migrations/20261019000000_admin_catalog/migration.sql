CREATE TABLE "car_make" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "car_make_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "car_make_name_key" ON "car_make"("name");

CREATE TABLE "car_model" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "years" INTEGER[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "car_model_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "car_model_makeId_name_key" ON "car_model"("makeId", "name");
CREATE INDEX "car_model_makeId_idx" ON "car_model"("makeId");
ALTER TABLE "car_model" ADD CONSTRAINT "car_model_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "car_make"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_category_name_key" ON "product_category"("name");

CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TABLE "listing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[] NOT NULL,
    "makeId" TEXT,
    "modelId" TEXT,
    "year" INTEGER,
    "categoryId" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "listing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "listing_status_createdAt_idx" ON "listing"("status", "createdAt");
CREATE INDEX "listing_categoryId_idx" ON "listing"("categoryId");
ALTER TABLE "listing" ADD CONSTRAINT "listing_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "car_make"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "listing" ADD CONSTRAINT "listing_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "car_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "listing" ADD CONSTRAINT "listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
