/**
 * CONFIG — every owner-supplied value the landing page needs.
 *
 * This is the one file to edit before launch. Anything already owned by the
 * database is NOT here: the business name, WhatsApp number, phone, address,
 * the properties themselves and the add-on prices all come from Supabase, so
 * they stay editable in Admin → Settings without a deploy.
 *
 * Two rules when filling this in:
 *
 * 1. Never invent proof. `googleRating`, `googleCount`, `reviews` and
 *    `familiesHosted` all degrade gracefully when left empty — the page drops
 *    the claim rather than showing a fabricated one. A visibly low or made-up
 *    review count converts worse than no count at all.
 * 2. `shravanFreeUnits` must be a real number and carries its own update
 *    date. If you can't keep it current, set it to null and the availability
 *    pill disappears.
 */

export type LandingImage = {
  /** A `/public` path, a Supabase bucket path, or a full URL. */
  path: string | null;
  /**
   * True while this is stock imagery. Renders a visible "Sample photo" badge
   * so a stranger's bathroom can never quietly ship under a heading that
   * promises "we photograph the parts other listings don't".
   * Set false as you replace each file — see public/images/landing/README.md.
   */
  placeholder?: boolean;
  /** Shown in the placeholder box until `path` is filled — describes the shot to take. */
  brief: string;
  /** Written for both search and screen readers; see the photography brief in §6. */
  alt: string;
};

export type LandingReview = {
  quote: string;
  name: string;
  /** Pilgrims trust reviewers from their own travel route — use real origin cities. */
  city: string;
  /** 1–5. Include at least one 4 with a reply: a wall of perfect fives reads as fabricated. */
  stars: number;
  /** Owner's public reply, shown indented beneath the quote. */
  reply?: string;
};

export const landingConfig = {
  // ── Host ──────────────────────────────────────────────────────────────
  host: {
    name: "", // BLOCKER — e.g. "Kamal Kishan"
    yearsInDeoghar: "", // e.g. "40"
  },

  // ── Distances (owner must physically measure — these feed schema and ads) ──
  distances: {
    temple: "", // BLOCKER — e.g. "3.5 km"
    templeTime: "", // BLOCKER — e.g. "10 minutes"
    airport: "", // e.g. "12 km"
    jasidih: "", // e.g. "9 km"
    baidyanathdham: "", // e.g. "2 km"
    aiims: "", // e.g. "8 km"
    basukinath: "43 km",
    trikut: "16 km",
    tapovan: "10 km",
  },

  // ── Pricing inputs the DB doesn't hold ────────────────────────────────
  pricing: {
    /** Indicative local hotel room rate, for the savings comparison. */
    hotelRoomRate: 2500,
    /** Percent of the total taken to hold a booking. */
    advancePct: 25,
  },

  // ── Response & cancellation promises (shown as commitments — keep them true) ──
  service: {
    replyMinutes: 15,
    hoursStart: "8am",
    hoursEnd: "9pm",
    /**
     * The same window in 24-hour numbers. Kept separate from the display
     * strings above so the sticky bar's "open now" pip is a comparison
     * rather than a parse of "8am" — the pip promises a response time, so
     * it must never claim open when you're asleep.
     */
    hoursStartHour: 8,
    hoursEndHour: 21,
    /** Free cancellation window, in days before check-in. */
    cancelDays: 7,
  },

  // ── Proof. Leave empty rather than inventing. ─────────────────────────
  proof: {
    /** null until you genuinely have a Google rating. */
    googleRating: null as number | null,
    /**
     * Under 10, the page hides the numeric rating entirely and leads with
     * families hosted instead — listings under 10 reviews convert at roughly
     * half the rate of those with 10–20.
     */
    googleCount: 0,
    googleReviewUrl: "",
    mmtRating: null as number | null,
    familiesHosted: null as number | null,
    yearStarted: "", // e.g. "2019"
    repeatPct: null as number | null,
    reviews: [] as LandingReview[],
  },

  // ── Shravan availability. Real numbers only, updated weekly. ──────────
  shravan: {
    /** null hides the availability pill entirely. Never guess this. */
    freeUnits: null as number | null,
    /** ISO date of the last time you updated `freeUnits`. */
    lastUpdated: "", // e.g. "2026-07-28"
  },

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

  // ── Links ─────────────────────────────────────────────────────────────
  links: {
    mapsUrl: "",
    instagram: "",
    facebook: "",
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

  /**
   * Landing-page photography. Hard cap of 16 distinct images on this page
   * (see lib/landing-images.ts) — property photos are counted against it, so
   * deep photography belongs on the property pages where intent is proven.
   *
   * Shoot in this priority order: bathroom → kitchen → living room with
   * people → made bedroom → entrance and lock → exterior with signage → car
   * with driver → water tank and inverter.
   *
   * Daylight only. No filters that alter wall colour, no wide-angle
   * distortion, no stock imagery, and never publish a photo more flattering
   * than the room actually is.
   */
  images: {
    hero: {
      path: "/images/landing/hero.jpg",
      placeholder: true,
      brief: "Temple shikhar at dawn, or your living room with a real family in it",
      alt: "Baba Baidyanath Dham temple at sunrise in Deoghar, Jharkhand",
    },
    host: {
      path: "/images/landing/host.jpg",
      placeholder: true,
      brief: "The owner at the property entrance, daylight, looking at camera. No suit, no studio.",
      alt: "Owner of Kailasha Stays standing at the entrance of the guest house in Deoghar",
    },
    bathroom: {
      path: "/images/landing/bathroom.jpg",
      placeholder: true,
      brief: "The bathroom with the lights on — the single most important photo on the page",
      alt: "Clean tiled bathroom with Western toilet and hot water geyser at Kailasha Stays Deoghar",
    },
    kitchen: {
      path: "/images/landing/kitchen.jpg",
      placeholder: true,
      brief: "The induction hob and the filtered water — show exactly what's provided, nothing more",
      alt: "Induction hob and filtered drinking water provided in a Kailasha Stays apartment",
    },
    utilities: {
      path: "/images/landing/utilities.jpg",
      placeholder: true,
      brief: "The overhead water tank and the inverter, together if possible",
      alt: "Overhead water tank and power backup inverter ensuring 24-hour water and electricity",
    },
    entrance: {
      path: "/images/landing/entrance.jpg",
      placeholder: true,
      brief: "The apartment's own door with its lock",
      alt: "Private apartment entrance with lock at Kailasha Stays",
    },
    exterior: {
      path: "/images/landing/exterior.jpg",
      placeholder: true,
      brief: "The building from the road, with signage visible",
      alt: "Exterior of the Kailasha Stays guest house building in Deoghar with signage",
    },
    car: {
      path: "/images/landing/car.jpg",
      placeholder: true,
      brief: "The actual car, with the actual driver",
      alt: "Clean rental car with driver available for temple visits and airport pickup in Deoghar",
    },
  } satisfies Record<string, LandingImage>,
} as const;

export type LandingConfig = typeof landingConfig;
