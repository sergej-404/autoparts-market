ALTER TABLE "notification" ADD COLUMN "batchId" TEXT;
CREATE INDEX "notification_batchId_idx" ON "notification"("batchId");
