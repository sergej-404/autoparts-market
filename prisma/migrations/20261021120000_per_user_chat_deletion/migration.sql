ALTER TABLE "chat_conversation"
  ADD COLUMN "buyerDeletedAt" TIMESTAMP(3),
  ADD COLUMN "sellerDeletedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "chat_conversation_buyerId_sellerId_listingId_key";

CREATE INDEX "chat_conversation_buyerId_sellerId_listingId_idx"
  ON "chat_conversation"("buyerId", "sellerId", "listingId");
