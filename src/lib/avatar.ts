export const DEFAULT_AVATAR_PATH = "/avatar.png";
export const R2_DEFAULT_PROFILE_SUBSTR = "default-profile.png";
export const DUMMY_PIXEL_PREFIX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";

const SAFE_DATA_IMAGE_REGEX =
  /^data:(image\/(?:jpeg|jpg|png|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/i;

export function isDummyOrDefaultPhoto(val: unknown): boolean {
  if (typeof val !== "string") return true;
  const s = val.trim();
  if (!s || s === "null" || s === "undefined") return true;
  if (s === DEFAULT_AVATAR_PATH || s.endsWith("/avatar.png")) return true;
  if (s.includes(R2_DEFAULT_PROFILE_SUBSTR)) return true;
  if (s.includes(DUMMY_PIXEL_PREFIX)) return true;
  return false;
}

export function isBackendPhotoProxyUrl(val: unknown): boolean {
  if (typeof val !== "string") return false;
  return /\/api\/users\/\d+\/photo\b/i.test(val.trim());
}

/**
 * Rewrites a Render backend `/api/users/:id/photo?v=...` URL into same-origin `/api/avatar/:id?v=...`.
 */
export function rewriteBackendPhotoUrl(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const s = val.trim();
  const match = s.match(/\/api\/users\/(\d+)\/photo(\?[^\s#]*)?/i);
  if (!match) return null;
  return `/api/avatar/${match[1]}${match[2] || ""}`;
}

/**
 * Extracts a safe raster data URI (`data:image/(jpeg|jpg|png|webp|gif|avif);base64,...`)
 * from either `photo` or `profileImage`, ignoring 1x1 dummy pixels and defaults.
 * SVG is intentionally disallowed to prevent stored XSS.
 */
export function extractSafeDataUrl(
  photo?: unknown,
  profileImage?: unknown,
): string | null {
  for (const candidate of [photo, profileImage]) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed || isDummyOrDefaultPhoto(trimmed)) continue;
    if (SAFE_DATA_IMAGE_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

export function parseSafeDataUrl(dataUrl: string): {
  mimeType: string;
  base64Body: string;
} | null {
  const match = dataUrl.trim().match(SAFE_DATA_IMAGE_REGEX);
  if (!match) return null;
  const rawMime = match[1].toLowerCase();
  const mimeType = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
  const base64Body = match[2].replace(/\s+/g, "");
  if (!base64Body) return null;
  return { mimeType, base64Body };
}

function extractVersionSuffix(
  updatedAt?: unknown,
  photo?: unknown,
  profileImage?: unknown,
): string {
  if (updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime())) {
    return String(updatedAt.getTime());
  }
  if (typeof updatedAt === "string" && updatedAt.trim()) {
    const parsed = Date.parse(updatedAt);
    if (!Number.isNaN(parsed)) return String(parsed);
  }
  if (typeof updatedAt === "number" && Number.isFinite(updatedAt) && updatedAt > 0) {
    return String(Math.floor(updatedAt));
  }
  for (const candidate of [photo, profileImage]) {
    if (typeof candidate === "string") {
      const m = candidate.match(/[?&]v=(\d+)/);
      if (m) return m[1];
    }
  }
  return "1";
}

/**
 * Resolves a user's display avatar URL to a lightweight same-origin endpoint
 * (`/api/avatar/:id?v=:ts`) whenever PostgreSQL holds a custom raster image,
 * avoiding Render cold-start timeouts and oversized JWT session cookies.
 */
export function resolveAvatarForDisplay(
  userId: number | string | null | undefined,
  photo?: unknown,
  profileImage?: unknown,
  updatedAt?: unknown,
  fallback: string = DEFAULT_AVATAR_PATH,
): string {
  const uid = Number(userId);
  const safeData = extractSafeDataUrl(photo, profileImage);
  if (safeData) {
    if (Number.isInteger(uid) && uid > 0) {
      const v = extractVersionSuffix(updatedAt, photo, profileImage);
      return `/api/avatar/${uid}?v=${v}`;
    }
    return safeData;
  }

  for (const candidate of [photo, profileImage]) {
    if (typeof candidate !== "string") continue;
    const s = candidate.trim();
    if (!s || isDummyOrDefaultPhoto(s)) continue;
    // Never hit /api/users/:id/photo on Render when DB holds no custom image.
    if (isBackendPhotoProxyUrl(s)) continue;
    if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("/")) {
      return s;
    }
  }

  return fallback;
}

export function normalizeApiUserPhoto(
  userId: number | string | null | undefined,
  photo?: unknown,
  profileImage?: unknown,
  updatedAt?: unknown,
  fallback: string = "",
): string {
  const resolved = resolveAvatarForDisplay(
    userId,
    photo,
    profileImage,
    updatedAt,
    "",
  );
  if (resolved) return resolved;
  return (
    rewriteBackendPhotoUrl(photo) ||
    rewriteBackendPhotoUrl(profileImage) ||
    fallback
  );
}
