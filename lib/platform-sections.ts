import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { homepageImageUrl } from "@/lib/images";
import { resolveProse, resolveTokens, type TokenCtx } from "@/lib/homepage-tokens";
import type { PlatformImage } from "@/lib/types/database";
import { resolvePlatformHeroImage } from "@/lib/platform-assets";
import {
  isPlatformSectionKey,
  platformSectionSchemas,
  type PlatformSectionContent,
  type PlatformSectionKey,
} from "@/lib/platform-sections-schema";

// Re-exported so server components can still get everything from this one
// module, as before the split. Client components ("use client" files) must
// import the schema/type/icon/meta exports directly from
// @/lib/platform-sections-schema instead — see that file's own comment for
// why importing a VALUE from here breaks the client bundle.
export * from "@/lib/platform-sections-schema";

/**
 * The apex homepage's content pipeline — same three-pass shape as
 * lib/homepage.ts (fetch → validate against zod → resolve tokens), against
 * platform_sections (0029) instead of the tenant-scoped homepage_sections.
 * The schemas themselves live in lib/platform-sections-schema.ts (client-safe
 * split, see that file); this module is the server-only fetch/resolve half.
 */

/* ------------------------------------------------------------------ */
/* Image resolution                                                   */
/* ------------------------------------------------------------------ */

export type ResolvedImage = {
  url: string;
  alt: string;
  title: string | null;
  isPlaceholder: boolean;
};

function resolveImage(id: string | null, images: Map<string, PlatformImage>): ResolvedImage | null {
  if (!id) return null;
  const row = images.get(id);
  if (!row) return null; // Dangling id (image deleted since) — degrade to no photo, never crash.
  const url = homepageImageUrl(row.storage_path);
  if (!url) return null;
  return { url, alt: row.alt ?? "", title: row.title, isPlaceholder: row.is_placeholder };
}

/* ------------------------------------------------------------------ */
/* Resolved shapes — what components/platform/*.tsx actually receive  */
/* ------------------------------------------------------------------ */

export type ResolvedPlatformHero = {
  eyebrow: string;
  headingHi: string;
  heading: string;
  lede: string;
  ctaLabelHi: string;
  ctaLabel: string;
  waCtaLabel: string;
  image: ResolvedImage | null;
  trustItems: string[];
};

export type ResolvedPlatformHomes = { eyebrowHi: string; eyebrow: string; lede: string };

export type ResolvedPlatformSavings = { heading: string; lede: string };

export type ResolvedPlatformLocation = {
  eyebrowHi: string;
  eyebrow: string;
  promiseBefore: string;
  promiseAfter: string;
  items: { label: string; range: string; note: string; icon: "landmark" | "train" | "plane" | "car" }[];
  footNote: string;
};

export type ResolvedPlatformComparison = {
  heading: string;
  lede: string;
  rows: { label: string; us: string; hotel: string; dharamshala: string }[];
};

export type ResolvedPlatformWhatWeArrange = {
  eyebrowHi: string;
  eyebrow: string;
  items: { icon: "flame" | "car" | "car-front" | "utensils"; title: string; body: string }[];
  footNote: string;
};

export type ResolvedPlatformSocialProof = {
  eyebrow: string;
  reviews: { name: string; quote: string; stars: number }[];
};

export type ResolvedPlatformHostBand = {
  eyebrow: string;
  heading: string;
  bodyParagraphs: string[];
  proofPoints: { icon: "template" | "chat" | "money"; label: string }[];
  ctaLabel: string;
  ctaWaMessage: string;
  secondaryCtaLabel: string;
};

export type ResolvedPlatformFaqItem = { q: string; a: string; comparison: boolean };
export type ResolvedPlatformFaq = {
  heading: string;
  items: ResolvedPlatformFaqItem[];
  footNote: string;
  waLabel: string;
};

export type ResolvedPlatformFinalCta = {
  headingHi: string;
  heading: string;
  lede: string;
  primaryCtaLabel: string;
  waCtaLabel: string;
};

export type PlatformSectionEntry =
  | { id: string; key: "hero"; resolved: ResolvedPlatformHero }
  | { id: string; key: "homes"; resolved: ResolvedPlatformHomes }
  | { id: string; key: "savings"; resolved: ResolvedPlatformSavings }
  | { id: string; key: "location"; resolved: ResolvedPlatformLocation }
  | { id: string; key: "comparison"; resolved: ResolvedPlatformComparison }
  | { id: string; key: "what_we_arrange"; resolved: ResolvedPlatformWhatWeArrange }
  | { id: string; key: "social_proof"; resolved: ResolvedPlatformSocialProof | null }
  | { id: string; key: "host_band"; resolved: ResolvedPlatformHostBand }
  | { id: string; key: "faq"; resolved: ResolvedPlatformFaq | null }
  | { id: string; key: "final_cta"; resolved: ResolvedPlatformFinalCta };

export type PlatformHomepageContent = {
  /** Keyed by section key for O(1) lookup — page.tsx renders these positionally regardless (§4 of the plan: no custom sections, so reorder support is a later, optional extension), but the map keeps callers from assuming an order. */
  sections: Map<PlatformSectionKey, PlatformSectionEntry>;
  images: Map<string, PlatformImage>;
};

/* ------------------------------------------------------------------ */
/* Per-section resolvers                                              */
/* ------------------------------------------------------------------ */

function resolveHero(
  c: PlatformSectionContent<"hero">,
  ctx: TokenCtx,
  images: Map<string, PlatformImage>,
): ResolvedPlatformHero {
  return {
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "",
    headingHi: resolveTokens(c.headingHi, ctx) ?? "",
    heading: resolveTokens(c.heading, ctx) ?? "",
    lede: resolveTokens(c.lede, ctx) ?? "",
    ctaLabelHi: resolveTokens(c.ctaLabelHi, ctx) ?? "",
    ctaLabel: resolveTokens(c.ctaLabel, ctx) ?? "",
    waCtaLabel: resolveTokens(c.waCtaLabel, ctx) ?? "WhatsApp us",
    // An uploaded library image wins; otherwise fall through to the
    // filesystem-checked asset exactly as today (lib/platform-assets.ts).
    image: resolveImage(c.imageId, images) ?? resolvePlatformHeroImageAsResolved(),
    trustItems: c.trustItems.map((item) => resolveTokens(item, ctx)).filter((v): v is string => v !== null),
  };
}

function resolvePlatformHeroImageAsResolved(): ResolvedImage | null {
  const src = resolvePlatformHeroImage();
  if (!src) return null;
  return { url: src, alt: "A home near Baba Baidyanath Dham, Deoghar", title: null, isPlaceholder: false };
}

function resolveHomes(c: PlatformSectionContent<"homes">, ctx: TokenCtx): ResolvedPlatformHomes {
  return {
    eyebrowHi: resolveTokens(c.eyebrowHi, ctx) ?? "",
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "Our verified homes in Deoghar",
    lede: resolveTokens(c.lede, ctx) ?? "",
  };
}

function resolveSavings(c: PlatformSectionContent<"savings">, ctx: TokenCtx): ResolvedPlatformSavings {
  return {
    heading: resolveTokens(c.heading, ctx) ?? "",
    lede: resolveTokens(c.lede, ctx) ?? "",
  };
}

function resolveLocation(
  c: PlatformSectionContent<"location">,
  ctx: TokenCtx,
): ResolvedPlatformLocation {
  return {
    eyebrowHi: resolveTokens(c.eyebrowHi, ctx) ?? "",
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "Where you'll be",
    promiseBefore: resolveTokens(c.promiseBefore, ctx) ?? "",
    promiseAfter: resolveTokens(c.promiseAfter, ctx) ?? "",
    items: c.items,
    footNote: resolveTokens(c.footNote, ctx) ?? "",
  };
}

function resolveComparison(
  c: PlatformSectionContent<"comparison">,
  ctx: TokenCtx,
): ResolvedPlatformComparison {
  return {
    heading: resolveTokens(c.heading, ctx) ?? "",
    lede: resolveTokens(c.lede, ctx) ?? "",
    rows: c.rows,
  };
}

function resolveWhatWeArrange(
  c: PlatformSectionContent<"what_we_arrange">,
  ctx: TokenCtx,
): ResolvedPlatformWhatWeArrange {
  return {
    eyebrowHi: resolveTokens(c.eyebrowHi, ctx) ?? "",
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "",
    items: c.items,
    footNote: resolveTokens(c.footNote, ctx) ?? "",
  };
}

function resolveSocialProof(
  c: PlatformSectionContent<"social_proof">,
  ctx: TokenCtx,
): ResolvedPlatformSocialProof | null {
  // Same "absent rather than hollow" rule as the tenant Proof section — an
  // eyebrow over an empty grid is worse than no section at all.
  if (!c.reviews.length) return null;
  return {
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "What families tell us afterwards",
    reviews: c.reviews,
  };
}

function resolveHostBand(
  c: PlatformSectionContent<"host_band">,
  ctx: TokenCtx,
): ResolvedPlatformHostBand {
  return {
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "",
    heading: resolveTokens(c.heading, ctx) ?? "",
    bodyParagraphs: resolveProse(c.body, ctx)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
    proofPoints: c.proofPoints,
    ctaLabel: resolveTokens(c.ctaLabel, ctx) ?? "",
    ctaWaMessage: resolveTokens(c.ctaWaMessage, ctx) ?? "",
    secondaryCtaLabel: resolveTokens(c.secondaryCtaLabel, ctx) ?? "",
  };
}

function resolveFaq(c: PlatformSectionContent<"faq">, ctx: TokenCtx): ResolvedPlatformFaq | null {
  const items = c.items
    .map((item) => {
      const q = resolveTokens(item.q, ctx);
      const a = resolveTokens(item.a, ctx);
      return q && a ? { q, a, comparison: item.comparison } : null;
    })
    .filter((v): v is ResolvedPlatformFaqItem => v !== null);

  if (!items.length) return null;

  return {
    heading: resolveTokens(c.heading, ctx) ?? "Questions",
    items,
    footNote: resolveTokens(c.footNote, ctx) ?? "",
    waLabel: resolveTokens(c.waLabel, ctx) ?? "Ask on WhatsApp",
  };
}

function resolveFinalCta(
  c: PlatformSectionContent<"final_cta">,
  ctx: TokenCtx,
): ResolvedPlatformFinalCta {
  return {
    headingHi: resolveTokens(c.headingHi, ctx) ?? "",
    heading: resolveTokens(c.heading, ctx) ?? "Pick your home. We'll do the rest.",
    lede: resolveTokens(c.lede, ctx) ?? "",
    primaryCtaLabel: resolveTokens(c.primaryCtaLabel, ctx) ?? "See all stays",
    waCtaLabel: resolveTokens(c.waCtaLabel, ctx) ?? "WhatsApp us",
  };
}

/* ------------------------------------------------------------------ */
/* Fallback order — used only when platform_sections is unreachable   */
/* (migration not yet applied, or a transient query failure)          */
/* ------------------------------------------------------------------ */

export const DEFAULT_PLATFORM_SECTION_ORDER: PlatformSectionKey[] = [
  "hero",
  "homes",
  "savings",
  "location",
  "comparison",
  "what_we_arrange",
  "social_proof",
  "host_band",
  "faq",
  "final_cta",
];

const NO_HIDE: PlatformSectionKey[] = ["hero", "homes", "final_cta"];

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

type RawPlatformSection = {
  id: string;
  key: string;
  content: unknown;
  visible: boolean;
  can_hide: boolean;
  pin: "first" | "last" | null;
  sort_order: number;
};

export type PlatformSectionRows = {
  rows: RawPlatformSection[];
  images: Map<string, PlatformImage>;
};

/**
 * Fetches the apex homepage's sections and media. Mirrors
 * fetchHomepageRows()'s shape exactly — same missing-table fallback (an
 * unreachable table degrades to an all-code-defaults render, never a
 * crashed or empty page), same anonymous read.
 */
export async function fetchPlatformSectionRows(): Promise<PlatformSectionRows> {
  const supabase = createPublicClient();

  const [sectionsResult, imagesResult] = await Promise.all([
    supabase
      .from("platform_sections")
      .select("id,key,content,visible,can_hide,pin,sort_order")
      .eq("visible", true)
      .order("sort_order", { ascending: true }),
    supabase.from("platform_images").select("*"),
  ]);

  const rows: RawPlatformSection[] =
    sectionsResult.error || !sectionsResult.data?.length
      ? DEFAULT_PLATFORM_SECTION_ORDER.map((key, i) => ({
          id: key,
          key,
          content: {},
          visible: true,
          can_hide: !NO_HIDE.includes(key),
          pin: key === "hero" ? "first" : key === "final_cta" ? "last" : null,
          sort_order: i * 10,
        }))
      : (sectionsResult.data as RawPlatformSection[]);

  const imageRows = (imagesResult.data ?? []) as PlatformImage[];
  return { rows, images: new Map(imageRows.map((row) => [row.id, row])) };
}

/**
 * Pure: turns fetched rows into resolved section content. No derived data
 * (property counts, walk times, rates) feeds token resolution today — every
 * section that needs a live number (LocationModule's walk-time bound,
 * SavingsCalculator's rates) takes it as a separate prop instead, so that
 * number can never go stale relative to what's actually published. ctx is
 * kept as a parameter, not inlined, so a future section can add a token
 * without changing this function's shape.
 */
export function resolvePlatformSectionContent({
  rows,
  images,
}: PlatformSectionRows): PlatformHomepageContent {
  const ctx: TokenCtx = {};

  const sections = new Map<PlatformSectionKey, PlatformSectionEntry>();

  for (const row of rows) {
    if (!isPlatformSectionKey(row.key)) continue; // Code that rendered this key is gone.

    const parsed = platformSectionSchemas[row.key].safeParse(row.content ?? {});
    if (!parsed.success) continue; // A malformed row is skipped, never crashes the page.
    const content = parsed.data;

    switch (row.key) {
      case "hero":
        sections.set(row.key, {
          id: row.id,
          key: "hero",
          resolved: resolveHero(content as PlatformSectionContent<"hero">, ctx, images),
        });
        break;
      case "homes":
        sections.set(row.key, {
          id: row.id,
          key: "homes",
          resolved: resolveHomes(content as PlatformSectionContent<"homes">, ctx),
        });
        break;
      case "savings":
        sections.set(row.key, {
          id: row.id,
          key: "savings",
          resolved: resolveSavings(content as PlatformSectionContent<"savings">, ctx),
        });
        break;
      case "location":
        sections.set(row.key, {
          id: row.id,
          key: "location",
          resolved: resolveLocation(content as PlatformSectionContent<"location">, ctx),
        });
        break;
      case "comparison":
        sections.set(row.key, {
          id: row.id,
          key: "comparison",
          resolved: resolveComparison(content as PlatformSectionContent<"comparison">, ctx),
        });
        break;
      case "what_we_arrange":
        sections.set(row.key, {
          id: row.id,
          key: "what_we_arrange",
          resolved: resolveWhatWeArrange(content as PlatformSectionContent<"what_we_arrange">, ctx),
        });
        break;
      case "social_proof":
        sections.set(row.key, {
          id: row.id,
          key: "social_proof",
          resolved: resolveSocialProof(content as PlatformSectionContent<"social_proof">, ctx),
        });
        break;
      case "host_band":
        sections.set(row.key, {
          id: row.id,
          key: "host_band",
          resolved: resolveHostBand(content as PlatformSectionContent<"host_band">, ctx),
        });
        break;
      case "faq":
        sections.set(row.key, {
          id: row.id,
          key: "faq",
          resolved: resolveFaq(content as PlatformSectionContent<"faq">, ctx),
        });
        break;
      case "final_cta":
        sections.set(row.key, {
          id: row.id,
          key: "final_cta",
          resolved: resolveFinalCta(content as PlatformSectionContent<"final_cta">, ctx),
        });
        break;
    }
  }

  // hero/homes/final_cta are can_hide=false — the server actions that write
  // `visible` refuse to flip them the same way updateSectionVisibility()
  // already refuses for the tenant builder (checked at the query, not just
  // the UI). This is the belt to that suspenders: if one is missing anyway
  // (a manual SQL edit, a transient fetch gap), backfill it from schema
  // defaults rather than let every caller handle a hole that should be
  // structurally impossible.
  for (const key of NO_HIDE) {
    if (sections.has(key)) continue;
    const defaults = platformSectionSchemas[key].parse({});
    switch (key) {
      case "hero":
        sections.set(key, { id: key, key, resolved: resolveHero(defaults as PlatformSectionContent<"hero">, ctx, images) });
        break;
      case "homes":
        sections.set(key, { id: key, key, resolved: resolveHomes(defaults as PlatformSectionContent<"homes">, ctx) });
        break;
      case "final_cta":
        sections.set(key, { id: key, key, resolved: resolveFinalCta(defaults as PlatformSectionContent<"final_cta">, ctx) });
        break;
    }
  }

  return { sections, images };
}

/** Fetch + resolve in one call, for callers with nothing to parallelise. */
export async function getPlatformSectionContent(): Promise<PlatformHomepageContent> {
  return resolvePlatformSectionContent(await fetchPlatformSectionRows());
}

/**
 * Typed accessor for a single section's resolved content. Plain
 * `content.sections.get(key)` widens to the union of every section's
 * `resolved` type — Map#get can't narrow on a literal key — so callers
 * (app/(platform)/page.tsx) use this instead of reaching into the map
 * directly.
 *
 * Explicit overloads, not a generic `Extract<..., { key: K }>` return type:
 * that formulation hits a real TS limitation (a distributive conditional
 * type compared against itself reports "two different types with this name
 * exist" — TS2719 — even though every instantiation is sound). Ten
 * overloads is more typing but no generic-variance puzzle for the next
 * person to debug.
 */
export function getSection(content: PlatformHomepageContent, key: "hero"): ResolvedPlatformHero | undefined;
export function getSection(content: PlatformHomepageContent, key: "homes"): ResolvedPlatformHomes | undefined;
export function getSection(content: PlatformHomepageContent, key: "savings"): ResolvedPlatformSavings | undefined;
export function getSection(content: PlatformHomepageContent, key: "location"): ResolvedPlatformLocation | undefined;
export function getSection(content: PlatformHomepageContent, key: "comparison"): ResolvedPlatformComparison | undefined;
export function getSection(content: PlatformHomepageContent, key: "what_we_arrange"): ResolvedPlatformWhatWeArrange | undefined;
export function getSection(content: PlatformHomepageContent, key: "social_proof"): ResolvedPlatformSocialProof | null | undefined;
export function getSection(content: PlatformHomepageContent, key: "host_band"): ResolvedPlatformHostBand | undefined;
export function getSection(content: PlatformHomepageContent, key: "faq"): ResolvedPlatformFaq | null | undefined;
export function getSection(content: PlatformHomepageContent, key: "final_cta"): ResolvedPlatformFinalCta | undefined;
export function getSection(
  content: PlatformHomepageContent,
  key: PlatformSectionKey,
): PlatformSectionEntry["resolved"] | undefined {
  return content.sections.get(key)?.resolved;
}
