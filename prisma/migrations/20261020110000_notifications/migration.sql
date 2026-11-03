CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'PERSONAL', 'GENERAL');
CREATE TABLE "notification" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "fromUserId" TEXT,
  "toUserId" TEXT NOT NULL,
  "title" TEXT,
  "text" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "eventKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "notification_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notification_eventKey_key" ON "notification"("eventKey");
CREATE INDEX "notification_toUserId_readAt_createdAt_idx" ON "notification"("toUserId", "readAt", "createdAt");
CREATE INDEX "notification_type_createdAt_idx" ON "notification"("type", "createdAt");
