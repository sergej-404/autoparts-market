CREATE TABLE "notification_preference" (
    "userId" TEXT NOT NULL,
    "site" BOOLEAN NOT NULL DEFAULT true,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "notification_preference"
ADD CONSTRAINT "notification_preference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
