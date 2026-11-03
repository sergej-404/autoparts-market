CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED');
CREATE TYPE "OrderFulfillment" AS ENUM ('PICKUP', 'OWN_PLACE');
CREATE TABLE "order" (
  "id" TEXT NOT NULL,
  "orderCode" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "fulfillment" "OrderFulfillment" NOT NULL,
  "meetingPlace" TEXT,
  "pickupAddress" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "total" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "order_item" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_orderCode_key" ON "order"("orderCode");
CREATE INDEX "order_userId_createdAt_idx" ON "order"("userId", "createdAt");
CREATE INDEX "order_status_createdAt_idx" ON "order"("status", "createdAt");
CREATE INDEX "order_item_orderId_idx" ON "order_item"("orderId");
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
