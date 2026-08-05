/**
 * Derives the small set of CSS custom properties the app's primary-color
 * tokens resolve to (app/globals.css's `--primary`, `--primary-hover`,
 * `--primary-tint`, `--ring`) from one admin-picked hex value.
 *
 * A single hex field is what the Brand settings form asks for — one color
 * picker, not four — so the hover and tint shades that make the theme read
 * as *designed* rather than *tinted* have to come from somewhere. Deriving
 * them here means every button's hover state and every tinted background
 * shifts together with the base color, instead of a new brand color mixing
 * with the original terracotta's hardcoded hover/tint and looking broken.
 *
 * `--primary-foreground` is deliberately NOT derived — it stays white
 * (app/globals.css's default). Computing readable foreground text for an
 * arbitrary admin-picked color is a real algorithm (WCAG contrast, not just
 * "is it light or dark"), and white already reads fine against the
 * mid-to-dark, reasonably saturated colors a business picks for a primary
 * brand color in practice. Revisit if a tenant picks something pale enough
 * that white text disappears.
 */

import type { CSSProperties } from "react";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mixes toward black (t=0) or white (t=1) by fraction `amount`. */
function mix(rgb: RGB, toward: RGB, amount: number): RGB {
  return {
    r: rgb.r + (toward.r - rgb.r) * amount,
    g: rgb.g + (toward.g - rgb.g) * amount,
    b: rgb.b + (toward.b - rgb.b) * amount,
  };
}

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };

export type BrandPalette = {
  primary: string;
  primaryHover: string;
  primaryTint: string;
  ring: string;
};

/** Null/invalid input means "use the app default" — callers skip the override entirely. */
export function deriveBrandPalette(hex: string | null | undefined): BrandPalette | null {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return null;

  return {
    primary: rgbToHex(rgb),
    // ~20% darker, matching the built-in terracotta→hover step (#c2410c → #9a3412).
    primaryHover: rgbToHex(mix(rgb, BLACK, 0.2)),
    // A pale wash for tinted backgrounds — nearly white, just enough of the hue to read as branded.
    primaryTint: rgbToHex(mix(rgb, WHITE, 0.94)),
    ring: rgbToHex(rgb),
  };
}

/** CSS custom property overrides for a `style` prop — spread onto a wrapper element. */
export function brandColorStyle(hex: string | null | undefined): CSSProperties {
  const palette = deriveBrandPalette(hex);
  if (!palette) return {};

  return {
    "--primary": palette.primary,
    "--primary-hover": palette.primaryHover,
    "--primary-tint": palette.primaryTint,
    "--ring": palette.ring,
  } as CSSProperties;
}
