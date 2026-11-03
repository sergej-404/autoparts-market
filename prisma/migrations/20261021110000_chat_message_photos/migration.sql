ALTER TABLE "chat_message" ADD COLUMN "photos" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "chat_message" ALTER COLUMN "text" SET DEFAULT '';
