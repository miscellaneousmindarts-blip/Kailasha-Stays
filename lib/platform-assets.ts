import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Where the platform's own (not any tenant's) brand assets live, and a
 * presence check so the apex — and the fallback chain other tenants use when
 * they haven't uploaded their own logo — can reference these paths today,
 * before the real files exist, without rendering broken images.
 *
 * Checking the filesystem rather than hardcoding `true`/`false` means dropping
 * the real file in at the exact path below is the entire integration: no
 * code change, no redeploy of this file, no flag to flip. Cheap enough to
 * call per-request (a handful of stat() calls) and every caller is itself
 * `cache()`-wrapped or runs once per page render.
 */

export const PLATFORM_LOGO_SVG = "/brand/deogharbnb-logo.svg";
export const PLATFORM_LOGO_PNG = "/brand/deogharbnb-logo.png";
export const PLATFORM_MARK_SVG = "/brand/deogharbnb-mark.svg";
export const PLATFORM_HERO_IMAGE = "/images/platform/hero.jpg";

function hasPublicAsset(publicPath: string): boolean {
  try {
    return existsSync(join(process.cwd(), "public", publicPath));
  } catch {
    return false;
  }
}

/** The wordmark for the header — SVG preferred, PNG fallback, else `null` (render text). */
export function resolvePlatformLogoSrc(): string | null {
  if (hasPublicAsset(PLATFORM_LOGO_SVG)) return PLATFORM_LOGO_SVG;
  if (hasPublicAsset(PLATFORM_LOGO_PNG)) return PLATFORM_LOGO_PNG;
  return null;
}

/** The square mark — for tight spaces where a wide wordmark doesn't fit. */
export function resolvePlatformMarkSrc(): string | null {
  return hasPublicAsset(PLATFORM_MARK_SVG) ? PLATFORM_MARK_SVG : null;
}

/** The apex hero photograph, or `null` until a real one is dropped in. */
export function resolvePlatformHeroImage(): string | null {
  return hasPublicAsset(PLATFORM_HERO_IMAGE) ? PLATFORM_HERO_IMAGE : null;
}
