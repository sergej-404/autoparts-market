CREATE TABLE "moderation_report" ("id" TEXT NOT NULL, "kind" TEXT NOT NULL, "targetId" TEXT NOT NULL, "reason" VARCHAR(120) NOT NULL, "details" VARCHAR(2000) NOT NULL, "reporterId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "moderation_report_pkey" PRIMARY KEY ("id"));
CREATE INDEX "moderation_report_kind_createdAt_idx" ON "moderation_report"("kind", "createdAt");
CREATE INDEX "moderation_report_targetId_idx" ON "moderation_report"("targetId");
CREATE TABLE "moderation_comment" ("id" TEXT NOT NULL, "listingId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "text" VARCHAR(2000) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "moderation_comment_pkey" PRIMARY KEY ("id"));
CREATE INDEX "moderation_comment_createdAt_idx" ON "moderation_comment"("createdAt");
CREATE INDEX "moderation_comment_listingId_idx" ON "moderation_comment"("listingId");
CREATE TABLE "listing_view_event" ("id" TEXT NOT NULL, "listingId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "listing_view_event_pkey" PRIMARY KEY ("id"));
CREATE INDEX "listing_view_event_listingId_createdAt_idx" ON "listing_view_event"("listingId", "createdAt");
