CREATE TABLE "listing_favorite_event" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_favorite_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_favorite_event_listingId_createdAt_idx"
    ON "listing_favorite_event"("listingId", "createdAt");

ALTER TABLE "listing_favorite_event"
    ADD CONSTRAINT "listing_favorite_event_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
