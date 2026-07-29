import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { getSiteSettings } from "@/lib/settings";
import { landingConfig } from "@/lib/landing-config";
import type { AddonService, PropertyImage, SiteSettings } from "@/lib/types/database";

/**
 * Hard cap from the performance budget: 16 distinct images on the landing
 * page. Eight are fixed (hero, host, and the six "nothing hidden" shots), so
 * the property cards get whatever is left. The close section deliberately
 * re-renders the SAME urls as the Homes section, which costs nothing extra —
 * only distinct sources count against this.
 */
const MAX_LANDING_IMAGES = 16;
const FIXED_IMAGE_COUNT = 8;
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
  amenities: string[];
  /** Already trimmed to the page's image budget — render all of them. */
  images: Pick<PropertyImage, "storage_path" | "alt" | "tag">[];
};

export type LandingData = {
  settings: SiteSettings;
  properties: LandingProperty[];
  addons: Pick<AddonService, "id" | "name" | "description" | "price" | "price_unit">[];
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
        "id, slug, title, max_guests, bedrooms, bathrooms, base_price, currency, amenities, property_images(storage_path, alt, tag, is_cover, sort_order)",
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
      amenities: p.amenities ?? [],
      images,
    };
  });

  return {
    settings,
    properties,
    addons: addonsResult.data ?? [],
  };
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
