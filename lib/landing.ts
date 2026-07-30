import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { getSiteSettings } from "@/lib/settings";
import { landingConfig } from "@/lib/landing-config";
import type { AddonService, PropertyImage, SiteSettings } from "@/lib/types/database";

/**
 * Hard cap from the performance budget: 16 distinct images on the landing
 * page. Eleven are fixed — hero, host, the six "nothing hidden" shots, and the
 * three "Where you'll be" landmark tiles — so the property cards get whatever
 * is left. The close section deliberately re-renders the SAME urls as the Homes
 * section, and the map's fallback tile reuses the first home's cover, which
 * costs nothing extra: only distinct sources count against this.
 *
 * Keep this in step with landingConfig.images. Adding a photo to a fixed
 * section without raising this number silently pushes the page over budget,
 * because the property cards are sized from whatever it says is left.
 */
const MAX_LANDING_IMAGES = 16;
const FIXED_IMAGE_COUNT = 11;
const CLUSTER_SIZE = 3;

export type LandingProperty = {
  id: string;
  slug: string;
  title: string;
  sleeps: number;
  bedrooms: number;
  bathrooms: number;
  ratePerNight: number | null;
  currency: string;
  distanceFromTemple: string | null;
  floor: string | null;
  city: string | null;
  addressLine: string | null;
  lat: number | null;
  lng: number | null;
  /** This property's own "Distances" rows, in the order the admin arranged them. */
  distances: LandingDistance[];
  amenities: string[];
  /** Already trimmed to the page's image budget — render all of them. */
  images: Pick<PropertyImage, "storage_path" | "alt" | "tag">[];
};

export type LandingDistance = { label: string; value: string };

export type LandingData = {
  settings: SiteSettings;
  properties: LandingProperty[];
  addons: Pick<AddonService, "id" | "name" | "description" | "price" | "price_unit">[];
  /**
   * The home the page's location story is told around — its map, its
   * distances, its travel time in the hero. Homes in other cities are still
   * listed, but a single landing page can only anchor to one place, and
   * merging landmarks across cities produced a strip that mixed Baidyanath
   * Dham with Vrindavan temples.
   */
  primary: LandingProperty | null;
};

/**
 * Spends the remaining image budget across the property cards: the first
 * cards get the full three-image cluster, later ones drop to a single photo,
 * and anything past the cap renders text-only rather than silently blowing
 * the budget. With one or two homes — the realistic case — every card gets
 * its full cluster.
 */
function allocateImageBudget(propertyCount: number): number[] {
  let remaining = MAX_LANDING_IMAGES - FIXED_IMAGE_COUNT;
  const allocation: number[] = [];

  for (let i = 0; i < propertyCount; i++) {
    // Reserve one image for each property still to come, so a later card
    // isn't starved by an earlier one taking a full cluster.
    const reserveForRest = propertyCount - i - 1;
    const take = Math.max(0, Math.min(CLUSTER_SIZE, remaining - reserveForRest));
    allocation.push(take);
    remaining -= take;
  }
  return allocation;
}

export async function getLandingData(): Promise<LandingData> {
  const supabase = createPublicClient();

  const [settings, propertiesResult, addonsResult] = await Promise.all([
    getSiteSettings(),
    supabase
      .from("properties")
      .select(
        "id, slug, title, max_guests, bedrooms, bathrooms, base_price, currency, amenities, city, address_line, lat, lng, property_images(storage_path, alt, tag, is_cover, sort_order), property_sections(title, type, content, visible, audience, sort_order)",
      )
      .eq("status", "published")
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("addon_services")
      .select("id, name, description, price, price_unit")
      .eq("active", true)
      .order("sort_order"),
  ]);

  const rows = propertiesResult.data ?? [];
  const budget = allocateImageBudget(rows.length);

  const properties: LandingProperty[] = rows.map((p, i) => {
    const extras = landingConfig.propertyExtras[p.slug] ?? {};
    const images = [...(p.property_images ?? [])]
      .sort(
        (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
      )
      .slice(0, budget[i])
      .map(({ storage_path, alt, tag }) => ({ storage_path, alt, tag }));

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      sleeps: p.max_guests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      ratePerNight: p.base_price,
      currency: p.currency,
      distanceFromTemple: extras.distanceFromTemple ?? null,
      floor: extras.floor ?? null,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
      addressLine: p.address_line,
      distances: readDistances(p.property_sections),
      amenities: p.amenities ?? [],
      images,
    };
  });

  const configured = landingConfig.map.propertySlug;
  const primary =
    (configured ? properties.find((p) => p.slug === configured) : undefined) ??
    properties[0] ??
    null;

  return {
    settings,
    properties,
    addons: addonsResult.data ?? [],
    primary,
  };
}

type KeyValueSection = {
  title: string | null;
  type: string;
  visible: boolean;
  audience: string;
  content: unknown;
};

/**
 * Reads one property's "Distances" key_value block. Kept per-property rather
 * than merged: the landmarks a guest cares about are the ones near the home
 * they're actually looking at.
 */
function readDistances(sections?: KeyValueSection[] | null): LandingDistance[] {
  const out: LandingDistance[] = [];

  for (const section of sections ?? []) {
    if (section.type !== "key_value" || !section.visible) continue;
    if (!/distance/i.test(section.title ?? "")) continue;
    // Guest-only sections aren't public, so they don't belong here.
    if (section.audience === "guest") continue;

    const content = section.content as { rows?: { label?: string; value?: string }[] };
    for (const row of content?.rows ?? []) {
      const label = row.label?.trim();
      const value = row.value?.trim();
      if (label && value) out.push({ label, value });
    }
  }
  return out;
}

/** The temple row, for the hero and FAQ. Matches the landmark by name rather
 *  than position, since each property lists its own nearest landmarks. */
export function templeDistance(distances: LandingDistance[]): LandingDistance | null {
  return (
    distances.find((d) => /baidyanath|baba.*dham/i.test(d.label)) ??
    distances.find((d) => /temple|mandir|dham/i.test(d.label)) ??
    null
  );
}

/** "1.4 km — 15 min walk" → "15 min walk", for sentences that want the time. */
export function travelTime(distance: LandingDistance | null): string | null {
  if (!distance) return null;
  const parts = distance.value.split(/[—–-]/);
  return (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim() || null;
}

/**
 * Every WhatsApp CTA carries a distinct `context` so the owner can tell from
 * the incoming message which page and section produced it — and a complete
 * pre-filled message, so the guest never has to compose one.
 */
export function waContext(
  whatsappNumber: string,
  context: string,
  extra = "",
): string {
  const text = `Namaste 🙏 (${context})${extra ? `\n${extra}` : ""}`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/** The cheapest published nightly rate, for the "from ₹X" headline. */
export function lowestRate(properties: LandingProperty[]): number | null {
  const rates = properties
    .map((p) => p.ratePerNight)
    .filter((r): r is number => r !== null);
  return rates.length ? Math.min(...rates) : null;
}
