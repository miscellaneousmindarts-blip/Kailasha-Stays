/**
 * CONFIG — what's left after the homepage builder (migration 0008) took over.
 *
 * Everything that used to live here as static, code-only values — host bio,
 * pricing, service promises, proof, Shravan availability, links, and all
 * homepage photography — is now owned by the database: site_settings for the
 * cross-section business facts, homepage_sections for section copy, and
 * homepage_images for photos. Edit those from Admin → Homepage and
 * Admin → Settings; a deploy is no longer needed for any of it.
 *
 * What's still here is what genuinely has nowhere else to live: which
 * property anchors the map, and facts about individual properties the
 * `properties` table doesn't hold.
 */

export const landingConfig = {
  /**
   * The map strip under the hero. Renders only once `NEXT_PUBLIC` is not
   * involved — the key is read server-side from GOOGLE_MAPS_STATIC_KEY — and
   * degrades to a plain numbered list without it, so the page is never
   * broken by a missing key.
   */
  map: {
    /**
     * Which home the map is centred on. A landing page can only anchor to
     * one city; other homes still appear in the Homes section. Leave empty
     * to use the first published property.
     */
    propertySlug: "luxury-2bhk-drolia-house",
    /** How many landmarks to plot. More than three is unreadable at 375px. */
    maxPins: 3,
    /**
     * Static Maps geocodes each pin from "<landmark>, <city>". Where a name
     * is ambiguous enough that Google lands on the wrong place, pin it here
     * with exact "lat,lng" — check by pasting the coordinates into Maps.
     */
    coordinateOverrides: {} as Record<string, string>,
  },

  /**
   * Per-property facts the properties table doesn't hold, keyed by slug.
   * Anything left out is simply omitted from the card's chip row rather than
   * rendering an empty chip. Everything else on the card — name, price,
   * sleeps, bedrooms, photos — comes from the database.
   */
  propertyExtras: {} as Record<
    string,
    { distanceFromTemple?: string; floor?: string }
  >,
} as const;

export type LandingConfig = typeof landingConfig;
