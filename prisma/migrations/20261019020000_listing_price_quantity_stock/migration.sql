ALTER TABLE "listing"
  ADD COLUMN "price" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "listing"
SET "status" = 'OUT_OF_STOCK'
WHERE "status" = 'PUBLISHED' AND "quantity" = 0;
