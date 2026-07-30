import { z } from "zod";
import {
  Columns2,
  Home as HomeIcon,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  MapPin,
  MessageSquareQuote,
  Percent,
  Quote,
  Sigma,
  Sparkles,
  Star,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * The homepage builder's registry.
 *
 * Two halves, because the homepage has two kinds of section:
 *
 *   builtinSchemas — sections whose markup lives in components/landing/. Every
 *   field the admin can edit is declared here as a zod schema, and `content` in
 *   the database is the WHOLE section (not a sparse override — see
 *   docs/homepage-builder-v2-plan.md §1). A row that fails its schema is
 *   skipped at render, never crashes the page.
 *
 *   layoutSchemas — templates for sections the admin composes from scratch.
 *   Unchanged from v1.
 *
 * Ordering, visibility and pinning are NOT here — they live on the
 * homepage_sections row itself (sort_order, visible, can_hide, pin), because
 * they're facts about a specific row, not about the section type.
 */

/* ------------------------------------------------------------------ */
/* Shared pieces                                                      */
/* ------------------------------------------------------------------ */

/** A reference into the homepage_images library, or none. */
const imageId = z.string().uuid().nullable().default(null);

/* ------------------------------------------------------------------ */
/* Builtin section schemas                                            */
/* ------------------------------------------------------------------ */

export const builtinSchemas = {
  hero: z.object({
    eyebrow: z.string().default(""),
    headingHi: z.string().default(""),
    heading: z.string().default(""),
    lede: z.string().default(""),
    ctaLabelHi: z.string().default(""),
    ctaLabel: z.string().default(""),
    imageId,
    chips: z.array(z.object({ label: z.string().min(1) })).default([]),
    // Ad-traffic message-match variants for ?src=. `src` must stay one of
    // these three values — isHeroVariant() in components/landing/hero.tsx
    // gates which ?src= values are even accepted.
    variants: z
      .array(
        z.object({
          src: z.enum(["shravan", "aiims", "weekend"]),
          heading: z.string().min(1),
          lede: z.string().min(1),
        }),
      )
      .default([]),
  }),

  trust_ribbon: z.object({
    items: z
      .array(
        z.object({
          icon: z.enum(["check", "star"]).default("check"),
          label: z.string().min(1),
        }),
      )
      .default([]),
  }),

  map: z.object({
    heading: z.string().default(""),
    sub: z.string().default(""),
    // Positional against the property's own Distances rows — index 0 is the
    // first row. Reordering those rows does NOT reorder these photos.
    landmarkImages: z
      .tuple([imageId, imageId, imageId])
      .default([null, null, null]),
  }),

  homes: z.object({
    eyebrowHi: z.string().default(""),
    eyebrow: z.string().default(""),
    heading: z.string().default(""),
    lede: z.string().default(""),
  }),

  why_apartment: z.object({
    heading: z.string().default(""),
    body: z.string().default(""),
  }),

  meet_host: z.object({
    eyebrowHi: z.string().default(""),
    eyebrow: z.string().default(""),
    heading: z.string().default(""),
    body: z.string().default(""),
    imageId,
    videoCallTitle: z.string().default(""),
    videoCallBody: z.string().default(""),
    videoCallCta: z.string().default(""),
  }),

  nothing_hidden: z.object({
    heading: z.string().default(""),
    lede: z.string().default(""),
    // Any number of photos — this is the one section with a genuinely
    // unbounded upload. See §6 of the plan re: the 16-image page budget.
    photos: z
      .array(
        z.object({
          imageId: z.string().uuid(),
        }),
      )
      .default([]),
    footNote: z.string().default(""),
  }),

  proof: z.object({
    heading: z.string().default(""),
    // Never seed a default rating here — proof is only ever real numbers or
    // absent. The editor must not offer a plausible-looking placeholder.
    stats: z
      .object({
        googleRating: z.number().min(0).max(5).nullable().default(null),
        googleCount: z.number().int().min(0).default(0),
        googleReviewUrl: z.string().default(""),
        mmtRating: z.number().min(0).max(5).nullable().default(null),
        familiesHosted: z.number().int().min(0).nullable().default(null),
        yearStarted: z.string().default(""),
        repeatPct: z.number().min(0).max(100).nullable().default(null),
      })
      .default({
        googleRating: null,
        googleCount: 0,
        googleReviewUrl: "",
        mmtRating: null,
        familiesHosted: null,
        yearStarted: "",
        repeatPct: null,
      }),
    reviews: z
      .array(
        z.object({
          name: z.string().min(1),
          city: z.string().default(""),
          stars: z.number().int().min(1).max(5),
          quote: z.string().min(1),
          reply: z.string().nullish(),
          imageId: z.string().uuid().nullish(),
        }),
      )
      .default([]),
    carousel: z
      .object({
        enabled: z.boolean().default(true),
        // Seconds for one full loop. Higher = slower/calmer.
        speedSeconds: z.number().min(10).max(120).default(40),
        pauseOnHover: z.boolean().default(true),
      })
      .default({ enabled: true, speedSeconds: 40, pauseOnHover: true }),
  }),

  services: z.object({
    note: z.string().default(""),
  }),

  shravan: z.object({
    eyebrow: z.string().default(""),
    heading: z.string().default(""),
    body: z.string().default(""),
    promise: z.string().default(""),
    ctaLabel: z.string().default(""),
    // Real numbers only, carrying its own update date. null hides the pill —
    // never guess this; faking scarcity would destroy the only asset this
    // page is building.
    freeUnits: z.number().int().min(0).nullable().default(null),
    lastUpdated: z.string().nullable().default(null),
  }),

  faq: z.object({
    heading: z.string().default(""),
    items: z
      .array(
        z.object({
          q: z.string().min(1),
          a: z.string().min(1),
          comparison: z.boolean().default(false),
        }),
      )
      .default([]),
    comparisonRows: z
      .array(
        z.object({
          label: z.string().min(1),
          us: z.string().min(1),
          hotel: z.string().min(1),
          dharamshala: z.string().min(1),
        }),
      )
      .default([]),
    closingLine: z.string().default(""),
  }),

  close: z.object({
    headingHi: z.string().default(""),
    heading: z.string().default(""),
    body: z.string().default(""),
    ctaLabel: z.string().default(""),
    shareHeadingHi: z.string().default(""),
    shareBody: z.string().default(""),
  }),
} as const;

export type BuiltinKey = keyof typeof builtinSchemas;
export type BuiltinContent<K extends BuiltinKey> = z.infer<(typeof builtinSchemas)[K]>;

export function isBuiltinKey(value: string): value is BuiltinKey {
  return value in builtinSchemas;
}

/** Display metadata for the admin outline. Ordering/visibility/pinning live on the DB row, not here. */
export const BUILTIN_META: Record<BuiltinKey, { label: string; note: string; icon: LucideIcon }> = {
  hero: { label: "Hero", note: "The first screen.", icon: Sparkles },
  trust_ribbon: { label: "Trust ribbon", note: "The thin row of reassurances under the hero.", icon: ListChecks },
  map: { label: "Where you'll be", note: "Map tile plus the three nearest landmarks.", icon: MapPin },
  homes: { label: "Our homes", note: "The property cards.", icon: HomeIcon },
  why_apartment: { label: "Why a 2BHK + calculator", note: "One short argument, then the saving calculator.", icon: Percent },
  meet_host: { label: "Meet your host", note: "Hidden until you set a host name.", icon: UserRound },
  nothing_hidden: { label: "Nothing hidden (photo grid)", note: "The full-width photo grid.", icon: ImageIcon },
  proof: { label: "Reviews and proof", note: "Renders only what real review data exists.", icon: Star },
  services: { label: "Add-on services", note: "Pulls from the add-on catalogue.", icon: Sparkles },
  shravan: { label: "Shravan notice", note: "The dark seasonal band about booking early.", icon: Sun },
  faq: { label: "FAQ", note: "Questions and the comparison table.", icon: MessageSquareQuote },
  close: { label: "Closing CTA", note: "The last screen.", icon: Sparkles },
};

/* ------------------------------------------------------------------ */
/* Custom section layouts                                             */
/* ------------------------------------------------------------------ */

/** Which band the section paints itself on, so custom sections alternate like the built-in ones do. */
const band = z.enum(["canvas", "sand", "ink"]).default("canvas");

export const layoutSchemas = {
  /** Image one side, words the other. The workhorse. */
  split: z.object({
    band,
    heading: z.string().min(1),
    body: z.string().nullish(),
    bullets: z.array(z.string().min(1)).default([]),
    imageId,
    imageSide: z.enum(["left", "right"]).default("left"),
  }),

  /** Full-bleed photo, dark scrim, words on top. Use sparingly — it is loud. */
  feature_band: z.object({
    heading: z.string().min(1),
    body: z.string().nullish(),
    imageId,
    ctaLabel: z.string().nullish(),
    ctaHref: z.string().nullish(),
  }),

  /** Asymmetric tile grid. First tile may be wide, any tile may be dark or carry a photo. */
  bento: z.object({
    band,
    heading: z.string().nullish(),
    tiles: z
      .array(
        z.object({
          heading: z.string().min(1),
          body: z.string().nullish(),
          imageId,
          wide: z.boolean().default(false),
          tone: z.enum(["light", "dark"]).default("light"),
        }),
      )
      .min(1)
      .max(6),
  }),

  /** Big figures with labels. Only worth using when the figures are real. */
  stat_row: z.object({
    band,
    heading: z.string().nullish(),
    stats: z
      .array(
        z.object({
          figure: z.string().min(1),
          label: z.string().min(1),
          note: z.string().nullish(),
        }),
      )
      .min(2)
      .max(4),
  }),

  /** One pulled quote, set large. */
  quote: z.object({
    band,
    quote: z.string().min(1),
    attribution: z.string().nullish(),
    role: z.string().nullish(),
  }),
} as const;

export type LayoutType = keyof typeof layoutSchemas;

export const LAYOUTS: Record<
  LayoutType,
  { label: string; note: string; icon: LucideIcon }
> = {
  split: {
    label: "Split",
    note: "Photo on one side, heading and copy on the other. Stacks on a phone.",
    icon: Columns2,
  },
  bento: {
    label: "Bento grid",
    note: "Asymmetric tiles. Mix text and photos; make one tile wide or dark to lead.",
    icon: LayoutGrid,
  },
  feature_band: {
    label: "Feature band",
    note: "Full-width photo with words over it. High impact — use it once.",
    icon: ImageIcon,
  },
  stat_row: {
    label: "Figures",
    note: "Two to four large numbers with labels.",
    icon: Sigma,
  },
  quote: {
    label: "Pull quote",
    note: "A single quote set large, with attribution.",
    icon: Quote,
  },
};

export const LAYOUT_TYPES = Object.keys(LAYOUTS) as LayoutType[];

export function isLayoutType(value: string): value is LayoutType {
  return value in layoutSchemas;
}

/** Empty-but-valid content so "add section" lands the admin on a real form. */
export function blankLayout(type: LayoutType): Record<string, unknown> {
  switch (type) {
    case "split":
      return { band: "canvas", heading: "", body: "", bullets: [], imageId: null, imageSide: "left" };
    case "feature_band":
      return { heading: "", body: "", imageId: null, ctaLabel: "", ctaHref: "" };
    case "bento":
      return {
        band: "canvas",
        heading: "",
        tiles: [{ heading: "", body: "", imageId: null, wide: true, tone: "dark" }],
      };
    case "stat_row":
      return { band: "sand", heading: "", stats: [{ figure: "", label: "" }, { figure: "", label: "" }] };
    case "quote":
      return { band: "sand", quote: "", attribution: "", role: "" };
  }
}

/**
 * Generic image-id collector for custom sections: walks the validated content
 * looking for any `imageId` key (top-level `split`/`feature_band`, or nested
 * in `bento`'s tiles) rather than special-casing each of the five shapes.
 * Used only to count images against the page's 16-image budget — see
 * lib/homepage.ts.
 */
export function collectLayoutImageIds(content: unknown, into: Set<string>): void {
  if (Array.isArray(content)) {
    for (const item of content) collectLayoutImageIds(item, into);
    return;
  }
  if (content && typeof content === "object") {
    for (const [key, value] of Object.entries(content)) {
      if (key === "imageId" && typeof value === "string") into.add(value);
      else collectLayoutImageIds(value, into);
    }
  }
}
