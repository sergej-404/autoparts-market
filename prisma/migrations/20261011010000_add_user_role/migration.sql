-- Add a default role to existing and newly registered users.
ALTER TABLE "user" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
