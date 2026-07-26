import { publicEnv } from "@/lib/env";

const PUBLIC_PREFIX = `${publicEnv.supabaseUrl}/storage/v1/object/public/property-images/`;

/**
 * Public URL for a photo in the property-images bucket.
 * Accepts a full URL too, so seed/imported data keeps working.
 */
export function imageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith("http")) return storagePath;
  return PUBLIC_PREFIX + storagePath.replace(/^\/+/, "");
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
