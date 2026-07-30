import { publicEnv } from "@/lib/env";

const PUBLIC_PREFIX = `${publicEnv.supabaseUrl}/storage/v1/object/public/property-images/`;
const HOMEPAGE_MEDIA_PREFIX = `${publicEnv.supabaseUrl}/storage/v1/object/public/homepage-media/`;

/**
 * Public URL for a photo in the property-images bucket.
 * Accepts a full URL too, so seed/imported data keeps working.
 */
export function imageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith("http")) return storagePath;
  // A leading slash means a file in /public — landing-page photography lives
  // there so the owner can drop replacements in without touching Supabase.
  if (storagePath.startsWith("/")) return storagePath;
  return PUBLIC_PREFIX + storagePath;
}

/**
 * Public URL for a photo in the homepage_images library. A separate prefix
 * from imageUrl() because the library's storage_path lives in its own
 * homepage-media bucket, not property-images — the two buckets are kept apart
 * so deleting a property can never take out the hero.
 *
 * Still accepts a `/public` path or a full URL, since the library seeds the
 * eleven existing /images/landing/*.jpg files by path without moving them.
 */
export function homepageImageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith("http")) return storagePath;
  if (storagePath.startsWith("/")) return storagePath;
  return HOMEPAGE_MEDIA_PREFIX + storagePath;
}

/**
 * A tiny inline placeholder so images fade in over a neutral tone instead of
 * flashing white. Keeps CLS at zero when paired with an aspect-ratio wrapper.
 */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#eceae6"/></svg>',
  ).toString("base64");
