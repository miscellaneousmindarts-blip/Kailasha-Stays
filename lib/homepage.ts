import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { homepageImageUrl } from "@/lib/images";
import {
  builtinSchemas,
  collectLayoutImageIds,
  isBuiltinKey,
  isLayoutType,
  layoutSchemas,
  type BuiltinContent,
  type LayoutType,
} from "@/lib/homepage-blocks";
import { resolveProse, resolveTokens, type TokenCtx } from "@/lib/homepage-tokens";
import type { HomepageImage, SiteSettings } from "@/lib/types/database";
import type { LandingProperty } from "@/lib/landing";
import { templeDistance, travelTime } from "@/lib/landing";

/**
 * The homepage content pipeline: raw DB rows in, fully resolved and typed
 * section content out. Three passes:
 *
 *   1. Fetch homepage_sections (visible only) and the homepage_images library.
 *   2. Validate each section's content against its zod schema — a row that
 *      fails is skipped, never crashes the page.
 *   3. Resolve {tokens} against a TokenCtx built from settings and the
 *      property data, and image ids against the library. A resolver returns
 *      `null` when the section has nothing left to show (no host name set, no
 *      review data, zero FAQ items survive) — same gate several of these
 *      sections already had in v1, just centralised here now that content is
 *      typed instead of a bag of override strings.
 */

/* ------------------------------------------------------------------ */
/* Resolved shapes — what the landing components actually receive     */
/* ------------------------------------------------------------------ */

export type ResolvedImage = {
  url: string;
  alt: string;
  title: string | null;
  isPlaceholder: boolean;
};

export type ResolvedHero = {
  eyebrow: string;
  headingHi: string;
  /** Brand-variant heading. Guaranteed non-empty — the H1 must never be blank. */
  heading: string;
  lede: string;
  ctaLabelHi: string;
  ctaLabel: string;
  image: ResolvedImage | null;
  chips: string[];
  variants: { src: "shravan" | "aiims" | "weekend"; heading: string; lede: string }[];
};

export type ResolvedTrustRibbon = { items: { icon: "check" | "star"; label: string }[] };

export type ResolvedMap = {
  heading: string;
  sub: string;
  /** Positional against the property's Distances rows — index 0 is the first row. */
  landmarkImages: (ResolvedImage | null)[];
};

export type ResolvedHomes = { eyebrowHi: string; eyebrow: string; heading: string; lede: string | null };

export type ResolvedWhyApartment = { heading: string; body: string };

export type ResolvedMeetHost = {
  eyebrowHi: string;
  eyebrow: string;
  heading: string;
  bodyParagraphs: string[];
  image: ResolvedImage | null;
  videoCallTitle: string;
  videoCallBody: string;
  videoCallCta: string;
};

export type ResolvedNothingHidden = {
  heading: string;
  lede: string | null;
  photos: { image: ResolvedImage }[];
  footNote: string | null;
};

export type ResolvedProof = {
  heading: string;
  stats: {
    googleRating: number | null;
    googleCount: number;
    googleReviewUrl: string;
    mmtRating: number | null;
    familiesHosted: number | null;
    yearStarted: string;
    repeatPct: number | null;
  };
  reviews: {
    name: string;
    city: string;
    stars: number;
    quote: string;
    reply: string | null;
    image: ResolvedImage | null;
  }[];
  carousel: { enabled: boolean; speedSeconds: number; pauseOnHover: boolean };
};

export type ResolvedServices = { note: string };

export type ResolvedShravan = {
  eyebrow: string;
  heading: string;
  body: string;
  promise: string;
  ctaLabel: string;
  freeUnits: number | null;
  lastUpdated: string | null;
};

export type ResolvedFaqItem = { q: string; a: string; comparison: boolean };
export type ResolvedFaq = {
  heading: string;
  items: ResolvedFaqItem[];
  comparisonRows: { label: string; us: string; hotel: string; dharamshala: string }[];
  closingLine: string;
};

export type ResolvedClose = {
  headingHi: string;
  heading: string;
  body: string;
  ctaLabel: string;
  shareHeadingHi: string;
  shareBody: string;
};

export type HomepageSectionEntry =
  | { kind: "builtin"; id: string; key: "hero"; resolved: ResolvedHero }
  | { kind: "builtin"; id: string; key: "trust_ribbon"; resolved: ResolvedTrustRibbon }
  | { kind: "builtin"; id: string; key: "map"; resolved: ResolvedMap }
  | { kind: "builtin"; id: string; key: "homes"; resolved: ResolvedHomes }
  | { kind: "builtin"; id: string; key: "why_apartment"; resolved: ResolvedWhyApartment }
  | { kind: "builtin"; id: string; key: "meet_host"; resolved: ResolvedMeetHost | null }
  | { kind: "builtin"; id: string; key: "nothing_hidden"; resolved: ResolvedNothingHidden | null }
  | { kind: "builtin"; id: string; key: "proof"; resolved: ResolvedProof | null }
  | { kind: "builtin"; id: string; key: "services"; resolved: ResolvedServices }
  | { kind: "builtin"; id: string; key: "shravan"; resolved: ResolvedShravan }
  | { kind: "builtin"; id: string; key: "faq"; resolved: ResolvedFaq | null }
  | { kind: "builtin"; id: string; key: "close"; resolved: ResolvedClose }
  | { kind: "custom"; id: string; type: LayoutType; content: Record<string, unknown> };

export type HomepageContent = {
  order: HomepageSectionEntry[];
  /** Distinct homepage-library images actually rendered — feeds the 16-image page budget (plan §6). */
  fixedImageCount: number;
  /** For CustomSection to resolve its own imageId fields at render time. */
  images: Map<string, HomepageImage>;
};

/* ------------------------------------------------------------------ */
/* Image resolution                                                   */
/* ------------------------------------------------------------------ */

function resolveImage(
  id: string | null,
  images: Map<string, HomepageImage>,
  used?: Set<string>,
): ResolvedImage | null {
  if (!id) return null;
  const row = images.get(id);
  if (!row) return null; // Dangling id (image deleted since) — degrade to no photo, never crash.
  const url = homepageImageUrl(row.storage_path);
  if (!url) return null;
  used?.add(id);
  return { url, alt: row.alt ?? "", title: row.title, isPlaceholder: row.is_placeholder };
}

/**
 * Public resolver for custom (page-builder) sections, which have five
 * different content shapes and don't get their own typed resolver — see
 * collectLayoutImageIds() for how their image ids are counted against the
 * page budget instead. components/landing/custom-sections.tsx calls this
 * directly at render time.
 */
export function resolveHomepageImage(
  id: string | null | undefined,
  images: Map<string, HomepageImage>,
): ResolvedImage | null {
  return resolveImage(id ?? null, images);
}

/* ------------------------------------------------------------------ */
/* Token context                                                      */
/* ------------------------------------------------------------------ */

const LAST_RESORT_HEADING = "A home of your own in Deoghar";

function sleepsRangeOf(properties: LandingProperty[]): string | null {
  const capacities = properties.map((p) => p.sleeps);
  if (!capacities.length) return null;
  const min = Math.min(...capacities);
  const max = Math.max(...capacities);
  return min === max ? `${min}` : `${min}–${max}`;
}

export function buildTokenCtx(
  settings: SiteSettings,
  properties: LandingProperty[],
  primary: LandingProperty | null,
): TokenCtx {
  const temple = templeDistance(primary?.distances ?? []);
  const travelTimeStr = travelTime(temple);

  return {
    businessName: settings.business_name,
    hostName: settings.host_name || null,
    hostYears: settings.host_years || null,
    cancelDays: String(settings.cancel_days),
    advancePct: String(settings.advance_pct),
    replyMinutes: String(settings.reply_minutes),
    hotelRoomRate: String(settings.hotel_room_rate),
    hoursStart: settings.hours_start,
    hoursEnd: settings.hours_end,
    year: String(new Date().getFullYear()),
    // Always present — mirrors the pre-v2 heroCopy(), which substituted the
    // word "minutes" rather than leaving the sentence broken.
    temple: travelTimeStr ?? "minutes",
    // NOT defaulted — a missing anchor landmark must drop the FAQ item that
    // asks about it, exactly as buildFaq() did before.
    templeLabel: temple?.label ?? null,
    templeDistance: temple?.value ?? null,
    count: String(properties.length),
    homes: properties.length === 1 ? "home" : "homes",
    sleepsRange: sleepsRangeOf(properties),
    sleepsMax: properties.length ? String(Math.max(...properties.map((p) => p.sleeps))) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Per-section resolvers                                              */
/* ------------------------------------------------------------------ */

function resolveHero(
  c: BuiltinContent<"hero">,
  ctx: TokenCtx,
  images: Map<string, HomepageImage>,
  used: Set<string>,
): ResolvedHero {
  return {
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "",
    headingHi: resolveTokens(c.headingHi, ctx) ?? "",
    heading: resolveTokens(c.heading, ctx) ?? LAST_RESORT_HEADING,
    lede: resolveTokens(c.lede, ctx) ?? "",
    ctaLabelHi: resolveTokens(c.ctaLabelHi, ctx) ?? "",
    ctaLabel: resolveTokens(c.ctaLabel, ctx) ?? "View our homes",
    image: resolveImage(c.imageId, images, used),
    chips: c.chips.map((chip) => resolveTokens(chip.label, ctx)).filter((v): v is string => v !== null),
    variants: c.variants
      .map((v) => {
        const heading = resolveTokens(v.heading, ctx);
        const lede = resolveTokens(v.lede, ctx);
        return heading && lede ? { src: v.src, heading, lede } : null;
      })
      .filter((v): v is ResolvedHero["variants"][number] => v !== null),
  };
}

function resolveTrustRibbon(c: BuiltinContent<"trust_ribbon">, ctx: TokenCtx): ResolvedTrustRibbon {
  return {
    items: c.items
      .map((item) => {
        const label = resolveTokens(item.label, ctx);
        return label ? { icon: item.icon, label } : null;
      })
      .filter((v): v is ResolvedTrustRibbon["items"][number] => v !== null),
  };
}

function resolveMap(
  c: BuiltinContent<"map">,
  ctx: TokenCtx,
  images: Map<string, HomepageImage>,
  used: Set<string>,
): ResolvedMap {
  return {
    heading: resolveTokens(c.heading, ctx) ?? "Where you'll be",
    sub: resolveTokens(c.sub, ctx) ?? "",
    landmarkImages: c.landmarkImages.map((id) => resolveImage(id, images, used)),
  };
}

function resolveHomes(c: BuiltinContent<"homes">, ctx: TokenCtx): ResolvedHomes {
  return {
    eyebrowHi: resolveTokens(c.eyebrowHi, ctx) ?? "",
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "Our homes",
    heading: resolveTokens(c.heading, ctx) ?? "Our homes",
    lede: resolveTokens(c.lede, ctx),
  };
}

function resolveWhyApartment(c: BuiltinContent<"why_apartment">, ctx: TokenCtx): ResolvedWhyApartment {
  return {
    heading: resolveTokens(c.heading, ctx) ?? "",
    body: resolveTokens(c.body, ctx) ?? "",
  };
}

/**
 * Hidden until a host name is set — the section's strongest trust device is
 * also the one most likely to be filled in late, so it degrades to absent
 * rather than showing "Namaste, I'm ." with a blank name.
 */
function resolveMeetHost(
  c: BuiltinContent<"meet_host">,
  ctx: TokenCtx,
  images: Map<string, HomepageImage>,
  used: Set<string>,
): ResolvedMeetHost | null {
  if (!ctx.hostName) return null;

  return {
    eyebrowHi: resolveTokens(c.eyebrowHi, ctx) ?? "आपका मेज़बान",
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "Your host",
    heading: resolveTokens(c.heading, ctx) ?? `Namaste, I'm ${ctx.hostName}.`,
    bodyParagraphs: resolveProse(c.body, ctx)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean),
    image: resolveImage(c.imageId, images, used),
    videoCallTitle: resolveTokens(c.videoCallTitle, ctx) ?? "",
    videoCallBody: resolveTokens(c.videoCallBody, ctx) ?? "",
    videoCallCta: resolveTokens(c.videoCallCta, ctx) ?? "",
  };
}

function resolveNothingHidden(
  c: BuiltinContent<"nothing_hidden">,
  ctx: TokenCtx,
  images: Map<string, HomepageImage>,
  used: Set<string>,
): ResolvedNothingHidden | null {
  const photos = c.photos
    .map((p) => {
      const image = resolveImage(p.imageId, images, used);
      return image ? { image } : null;
    })
    .filter((v): v is { image: ResolvedImage } => v !== null);

  // Nothing to show is worse than a heading over an empty grid — matches the
  // "absent rather than hollow" rule Proof already followed in v1.
  if (!photos.length) return null;

  return {
    heading: resolveTokens(c.heading, ctx) ?? "",
    lede: resolveTokens(c.lede, ctx),
    photos,
    footNote: resolveTokens(c.footNote, ctx),
  };
}

function resolveProof(
  c: BuiltinContent<"proof">,
  ctx: TokenCtx,
  images: Map<string, HomepageImage>,
  used: Set<string>,
): ResolvedProof | null {
  const showRating = c.stats.googleRating !== null && c.stats.googleCount >= 10;
  const hasSummary = showRating || c.stats.familiesHosted !== null || c.stats.repeatPct !== null;

  if (!hasSummary && !c.reviews.length) return null;

  return {
    heading:
      resolveTokens(c.heading, ctx) ??
      (c.stats.familiesHosted && c.stats.yearStarted
        ? `${c.stats.familiesHosted} families have stayed here since ${c.stats.yearStarted}.`
        : "What families tell us afterwards."),
    stats: c.stats,
    reviews: c.reviews.map((r) => ({
      name: r.name,
      city: r.city,
      stars: r.stars,
      quote: r.quote,
      reply: r.reply ?? null,
      image: resolveImage(r.imageId ?? null, images, used),
    })),
    carousel: c.carousel,
  };
}

function resolveServices(c: BuiltinContent<"services">, ctx: TokenCtx): ResolvedServices {
  return { note: resolveTokens(c.note, ctx) ?? "" };
}

function resolveShravan(c: BuiltinContent<"shravan">, ctx: TokenCtx): ResolvedShravan {
  return {
    eyebrow: resolveTokens(c.eyebrow, ctx) ?? "",
    heading: resolveTokens(c.heading, ctx) ?? "",
    body: resolveTokens(c.body, ctx) ?? "",
    promise: resolveTokens(c.promise, ctx) ?? "",
    ctaLabel: resolveTokens(c.ctaLabel, ctx) ?? "See which homes are free",
    freeUnits: c.freeUnits,
    lastUpdated: c.lastUpdated,
  };
}

function resolveFaq(c: BuiltinContent<"faq">, ctx: TokenCtx): ResolvedFaq | null {
  const items = c.items
    .map((item) => {
      const q = resolveTokens(item.q, ctx);
      const a = resolveTokens(item.a, ctx);
      return q && a ? { q, a, comparison: item.comparison } : null;
    })
    .filter((v): v is ResolvedFaqItem => v !== null);

  if (!items.length) return null;

  return {
    heading: resolveTokens(c.heading, ctx) ?? "Questions",
    items,
    comparisonRows: c.comparisonRows,
    closingLine: resolveTokens(c.closingLine, ctx) ?? "",
  };
}

function resolveClose(c: BuiltinContent<"close">, ctx: TokenCtx): ResolvedClose {
  return {
    headingHi: resolveTokens(c.headingHi, ctx) ?? "",
    heading: resolveTokens(c.heading, ctx) ?? "Pick your home.",
    body: resolveTokens(c.body, ctx) ?? "",
    ctaLabel: resolveTokens(c.ctaLabel, ctx) ?? "See our homes",
    shareHeadingHi: resolveTokens(c.shareHeadingHi, ctx) ?? "",
    shareBody: resolveTokens(c.shareBody, ctx) ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Fallback order — used only when homepage_sections is unreachable   */
/* (migration not yet applied, or a transient query failure)          */
/* ------------------------------------------------------------------ */

export const DEFAULT_SECTION_ORDER = [
  "hero",
  "trust_ribbon",
  "map",
  "homes",
  "why_apartment",
  "meet_host",
  "nothing_hidden",
  "proof",
  "services",
  "shravan",
  "faq",
  "close",
] as const;

/* ------------------------------------------------------------------ */
/* Entry point                                                        */
/* ------------------------------------------------------------------ */

type RawSection = {
  id: string;
  key: string;
  kind: "builtin" | "custom";
  type: string;
  content: unknown;
  visible: boolean;
  can_hide: boolean;
  pin: "first" | "last" | null;
  sort_order: number;
};

export async function getHomepageContent(
  tenantId: string,
  settings: SiteSettings,
  properties: LandingProperty[],
  primary: LandingProperty | null,
): Promise<HomepageContent> {
  const supabase = createPublicClient();

  const [sectionsResult, imagesResult] = await Promise.all([
    supabase
      .from("homepage_sections")
      .select("id,key,kind,type,content,visible,can_hide,pin,sort_order")
      .eq("tenant_id", tenantId)
      .eq("visible", true)
      .order("sort_order", { ascending: true }),
    // homepage_images is still anon-readable across tenants (a known gap
    // tracked to B8), so this filter is what actually keeps one tenant's
    // media out of another's page — not the RLS policy.
    supabase.from("homepage_images").select("*").eq("tenant_id", tenantId),
  ]);

  // Missing tables (migration not applied) or any other failure: an empty
  // homepage is worse than one that can't be customised yet, so fall back to
  // an all-defaults render using each schema's own zod defaults.
  const rows: RawSection[] =
    sectionsResult.error || !sectionsResult.data?.length
      ? DEFAULT_SECTION_ORDER.map((key, i) => ({
          id: key,
          key,
          kind: "builtin" as const,
          type: key,
          content: {},
          visible: true,
          can_hide: key !== "hero" && key !== "homes" && key !== "close",
          pin: key === "hero" ? "first" : key === "close" ? "last" : null,
          sort_order: i * 10,
        }))
      : (sectionsResult.data as RawSection[]);

  const imageRows = (imagesResult.data ?? []) as HomepageImage[];
  const images = new Map(imageRows.map((row) => [row.id, row]));

  const ctx = buildTokenCtx(settings, properties, primary);
  const used = new Set<string>();
  const order: HomepageSectionEntry[] = [];

  for (const row of rows) {
    if (row.kind === "builtin") {
      if (!isBuiltinKey(row.key)) continue; // Code that rendered this key is gone.

      const parsed = builtinSchemas[row.key].safeParse(row.content ?? {});
      if (!parsed.success) continue; // A malformed row is skipped, never crashes the page.
      const content = parsed.data;

      switch (row.key) {
        case "hero":
          order.push({ kind: "builtin", id: row.id, key: "hero", resolved: resolveHero(content as BuiltinContent<"hero">, ctx, images, used) });
          break;
        case "trust_ribbon":
          order.push({ kind: "builtin", id: row.id, key: "trust_ribbon", resolved: resolveTrustRibbon(content as BuiltinContent<"trust_ribbon">, ctx) });
          break;
        case "map":
          order.push({ kind: "builtin", id: row.id, key: "map", resolved: resolveMap(content as BuiltinContent<"map">, ctx, images, used) });
          break;
        case "homes":
          order.push({ kind: "builtin", id: row.id, key: "homes", resolved: resolveHomes(content as BuiltinContent<"homes">, ctx) });
          break;
        case "why_apartment":
          order.push({ kind: "builtin", id: row.id, key: "why_apartment", resolved: resolveWhyApartment(content as BuiltinContent<"why_apartment">, ctx) });
          break;
        case "meet_host":
          order.push({ kind: "builtin", id: row.id, key: "meet_host", resolved: resolveMeetHost(content as BuiltinContent<"meet_host">, ctx, images, used) });
          break;
        case "nothing_hidden":
          order.push({ kind: "builtin", id: row.id, key: "nothing_hidden", resolved: resolveNothingHidden(content as BuiltinContent<"nothing_hidden">, ctx, images, used) });
          break;
        case "proof":
          order.push({ kind: "builtin", id: row.id, key: "proof", resolved: resolveProof(content as BuiltinContent<"proof">, ctx, images, used) });
          break;
        case "services":
          order.push({ kind: "builtin", id: row.id, key: "services", resolved: resolveServices(content as BuiltinContent<"services">, ctx) });
          break;
        case "shravan":
          order.push({ kind: "builtin", id: row.id, key: "shravan", resolved: resolveShravan(content as BuiltinContent<"shravan">, ctx) });
          break;
        case "faq":
          order.push({ kind: "builtin", id: row.id, key: "faq", resolved: resolveFaq(content as BuiltinContent<"faq">, ctx) });
          break;
        case "close":
          order.push({ kind: "builtin", id: row.id, key: "close", resolved: resolveClose(content as BuiltinContent<"close">, ctx) });
          break;
      }
      continue;
    }

    // Custom sections: validated, never token-resolved (unchanged from v1).
    // Their image ids ARE counted against the budget, generically, since a
    // "split" or "bento" section can carry just as many photos as a builtin.
    if (!isLayoutType(row.type)) continue;
    const parsedLayout = layoutSchemas[row.type].safeParse(row.content);
    if (!parsedLayout.success) continue;
    collectLayoutImageIds(parsedLayout.data, used);
    order.push({ kind: "custom", id: row.id, type: row.type, content: parsedLayout.data as Record<string, unknown> });
  }

  return { order, fixedImageCount: used.size, images };
}
