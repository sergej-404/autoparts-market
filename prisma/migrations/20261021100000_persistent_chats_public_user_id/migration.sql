ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "publicId" TEXT;
DO $$
DECLARE
  target_user RECORD;
  candidate TEXT;
BEGIN
  FOR target_user IN SELECT "id" FROM "user" WHERE "publicId" IS NULL LOOP
    LOOP
      candidate := 'us-' || lpad((floor(random() * 1000000))::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "user" WHERE "publicId" = candidate);
    END LOOP;
    UPDATE "user" SET "publicId" = candidate WHERE "id" = target_user."id";
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "user_publicId_key" ON "user"("publicId");
ALTER TABLE "user" ALTER COLUMN "publicId" SET DEFAULT ('us-'::text || lpad((floor(random() * 1000000))::text, 6, '0'::text));
ALTER TABLE "user" ALTER COLUMN "publicId" SET NOT NULL;
CREATE TABLE "chat_conversation" (
  "id" TEXT NOT NULL, "buyerId" TEXT NOT NULL, "sellerId" TEXT NOT NULL, "listingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_conversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "chat_message" (
  "id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "senderId" TEXT NOT NULL, "text" VARCHAR(2000) NOT NULL,
  "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chat_conversation_buyerId_sellerId_listingId_key" ON "chat_conversation"("buyerId", "sellerId", "listingId");
CREATE INDEX "chat_conversation_buyerId_updatedAt_idx" ON "chat_conversation"("buyerId", "updatedAt");
CREATE INDEX "chat_conversation_sellerId_updatedAt_idx" ON "chat_conversation"("sellerId", "updatedAt");
CREATE INDEX "chat_message_conversationId_createdAt_idx" ON "chat_message"("conversationId", "createdAt");
CREATE INDEX "chat_message_senderId_readAt_idx" ON "chat_message"("senderId", "readAt");
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
