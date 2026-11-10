const BLOB_HOST_PATTERN = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;
const BLOB_PATH_PATTERN = /^\/listings\/[a-z0-9._-]+\.(jpg|png|webp)$/i;

export function isAllowedListingImage(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      BLOB_HOST_PATTERN.test(url.hostname) &&
      BLOB_PATH_PATTERN.test(url.pathname) &&
      !url.search &&
      !url.hash;
  } catch {
    return false;
  }
}
