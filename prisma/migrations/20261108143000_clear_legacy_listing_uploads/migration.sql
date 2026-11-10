-- Vercel Functions have a read-only deployment filesystem. Legacy /uploads files
-- were stored outside durable storage and are not available in production.
-- Keep valid Vercel Blob URLs if a listing already contains any; remove only legacy paths.
UPDATE "listing" AS listing
SET "images" = COALESCE(
  (
    SELECT array_agg(image_url)
    FROM unnest(listing."images") AS image_url
    WHERE image_url ~* '^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/listings/[a-z0-9._-]+\.(jpg|png|webp)$'
  ),
  ARRAY[]::text[]
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(listing."images") AS image_url
  WHERE image_url LIKE '/uploads/%'
);
