CREATE TABLE "order_message" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "text" VARCHAR(2000) NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "order_message_orderId_createdAt_idx" ON "order_message"("orderId", "createdAt");
CREATE INDEX "order_message_recipientId_readAt_idx" ON "order_message"("recipientId", "readAt");
