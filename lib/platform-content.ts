/**
 * Copy and facts that belong to the PLATFORM (deogharbnb.space itself), not
 * to any one tenant. Typed consts, not a CMS — see docs/apex-page-plan.md
 * §3: this keeps the apex honest about what's platform-owned vs tenant-owned,
 * and needs no migration.
 *
 * Contact details below are the same working WhatsApp/phone the Kailasha
 * Stays tenant already publishes (site_settings for tenant d2f0c762) — the
 * platform and that tenant share an operator today, so reusing a real,
 * answered number is more honest than inventing a separate platform line
 * nobody is watching. Update here if that ever changes.
 */

import type { PublicSiteBranding } from "@/lib/types/database";

/** Digits only, international format — for wa.me links. */
export const PLATFORM_WHATSAPP_NUMBER = "917033332227";
/** As displayed, for tel: links and on-page text. */
export const PLATFORM_CONTACT_PHONE = "7033332227";

export const PLATFORM_REPLY_MINUTES = 15;
export const PLATFORM_HOURS_START = "9am";
export const PLATFORM_HOURS_START_HOUR = 9;
export const PLATFORM_HOURS_END_HOUR = 21;

/** Indicative local hotel room rate for the savings calculator — matches
 *  site_settings.hotel_room_rate, which is 2500 for every tenant today. */
export const PLATFORM_HOTEL_ROOM_RATE = 2500;

/** Matches every tenant's current site_settings (0006_stay_defaults.sql defaults). */
export const PLATFORM_CANCEL_DAYS = 7;
export const PLATFORM_ADVANCE_PCT = 25;

export const PLATFORM_NAME = "Deoghar BnB";
export const PLATFORM_SITE_URL = "https://deogharbnb.space";

export function platformWaLink(context: string, extra = ""): string {
  const text = `Namaste 🙏 (${context})${extra ? `\n${extra}` : ""}`;
  return `https://wa.me/${PLATFORM_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * S6 — deliberately ranges, not exact figures (see docs/apex-page-plan.md
 * §S6). Grounded in the two live properties' own Distances sections, both of
 * which put Baidyanath Dham at 1.4 km / 15 min walk, Jasidih Station at 6 km,
 * Deoghar Airport at 5 km. As more homes are added their own distances may
 * differ — that's exactly why this is a range, not their number restated.
 */
export const LOCATION_RANGES: {
  label: string;
  range: string;
  note: string;
  icon: "landmark" | "train" | "plane" | "car";
}[] = [
  {
    label: "Baba Baidyanath Dham",
    range: "5–25 min walk",
    note: "The temple every home is built around being near.",
    icon: "landmark",
  },
  {
    label: "Jasidih Railway Station",
    range: "15–20 min by cab",
    note: "The station most trains into Deoghar actually stop at.",
    icon: "train",
  },
  {
    label: "Deoghar Airport",
    range: "25–30 min by cab",
    note: "Direct flights from Kolkata, Delhi and Patna.",
    icon: "plane",
  },
  {
    label: "Basukinath",
    range: "~1 hr by car",
    note: "The usual day-trip pairing with Baidyanath Dham.",
    icon: "car",
  },
];

/** Upper bound for §S6a's promise sentence, if live data ever can't produce
 *  one (e.g. no property has a parsed walk time yet). Kept generous on
 *  purpose — a promise this wide is trivially true and never needs revising
 *  downward, only tightened once more homes report their real distance. */
export const LOCATION_WALK_MINUTES_FALLBACK = 25;

/** S8 — "What we arrange." Prices are the actual current figures from the
 *  strategy doc's research; update here if they change, they're typed
 *  copy, not derived from anywhere else. */
export const WHAT_WE_ARRANGE: {
  icon: "flame" | "car" | "car-front" | "utensils";
  title: string;
  body: string;
}[] = [
  {
    icon: "flame",
    title: "Pooja & Pandit assistance",
    body: "We'll connect you with a Pandit we know personally at Baidyanath Dham, plus guidance on Shringar Puja timings and what samagri to carry.",
  },
  {
    icon: "car",
    title: "Airport & station pickup",
    body: "Door-to-door from Deoghar Airport or Jasidih Station. Fixed price, told to you in advance — no haggling with a driver at midnight. From ₹600.",
  },
  {
    icon: "car-front",
    title: "Car with driver",
    body: "AC sedan and local driver for Basukinath, Trikut, Tapovan or Nandan Pahar. From ₹2,500/day.",
  },
  {
    icon: "utensils",
    title: "Food",
    body: "Room service from the restaurant downstairs at some properties, home-cooked meals arranged at others. Tell us what you need.",
  },
];

/**
 * S10 — real reviews, reused verbatim from the Kailasha Stays homepage's own
 * `proof` section (homepage_sections, type=proof, tenant d2f0c762). No
 * platform-wide aggregate rating exists anywhere in the database (that
 * tenant's own googleRating is null, googleCount is 0) — so there is nothing
 * defensible to compute a "★ 4.8 average" line from. Show the reviews
 * themselves; don't invent a number to summarise them.
 *
 * No source platform is recorded against these in the database either
 * (proof.reviews has no "via" field) — attributing them to Airbnb or Google
 * without knowing which would be a claim the data doesn't back, so none is
 * shown. As homes from other hosts add their own reviews, extend this list
 * or replace it with a real reviews table (Part B).
 */
export const PLATFORM_REVIEWS: { name: string; quote: string; stars: number }[] = [
  {
    name: "Ajay",
    quote:
      "I tried a BnB in Deoghar for the first time, and the experience was genuinely impressive. The property offered ample parking, and the apartment itself was beautifully designed with tasteful interiors. It was incredibly spacious and featured multiple balconies that opened up to stunning views, making the stay comfortable and memorable. Will always stay in the same place.",
    stars: 5,
  },
  {
    name: "Sachin",
    quote:
      "Great experience, prime location, extremely responsive and polite host, hassle free checkin. All over I would recommend the property to anyone traveling to Deoghar. Apt for all kinds of travelers be it family, friends or couples. Definitely recommended.",
    stars: 5,
  },
  {
    name: "Aayush",
    quote:
      "I booked this flat for my parents as they were on a pilgrimage trip, and the stay was absolutely comfortable. The flat was neat, clean, and very well arranged. It gave a homely and peaceful feeling, which was perfect for them. The host was very kind and helpful, always available when needed.",
    stars: 5,
  },
  {
    name: "Amrita",
    quote:
      "The place was pretty nice and well maintained. Host makes every effort to make the stay comfortable, they are very proactive in communication. The place is near Baba Dham, you will find easy commute options there.",
    stars: 5,
  },
];

/**
 * S12 — the platform's own FAQ. Answers are written fresh for the apex
 * (no {templeDistance}-style per-property tokens, since the apex speaks for
 * several homes), but the FACTS inside them — 25% advance, 7-day free
 * cancellation, the induction-hob-not-a-kitchen line, the Shravan no-cancel
 * promise — are the same real policy already live on the Kailasha Stays
 * tenant page, not invented for this page.
 */
export const PLATFORM_FAQ: { q: string; a: string; comparison?: boolean }[] = [
  {
    q: "How far are your homes from Baidyanath Dham temple?",
    a: "Every home we list is within a 25-minute walk of the temple — most are far closer. Each home's own page lists its exact distance, measured from that door.",
  },
  {
    q: "What if I pay the advance and something goes wrong?",
    a: `Free cancellation up to ${PLATFORM_CANCEL_DAYS} days before check-in with a full refund. Only ${PLATFORM_ADVANCE_PCT}% upfront, balance on arrival.`,
  },
  {
    q: "Will the price change after I book?",
    a: "No. The rate we send you in writing is the rate you pay. Festival dates cost more and we tell you that upfront — never as a surprise at check-in.",
  },
  {
    q: "Is it suitable for elderly parents?",
    a: "Most homes offer a ground-floor option, a Western toilet with a grab bar, hot water 24×7, and parking at the door. Tell us their needs when you enquire and we'll match you to the right home.",
  },
  {
    q: "How does this compare to a hotel or a dharamshala?",
    a: "A dharamshala is the cheapest option and we won't pretend otherwise. What you get here instead is the whole flat for your family, a private bathroom, a price fixed in writing, and a booking we will not cancel during Shravan.",
    comparison: true,
  },
  {
    q: "Can we cook our own food?",
    a: "Not a full kitchen — we don't want to promise one we don't have. Most homes have an induction hob for the basics: tea, coffee, warming milk or baby food. For full meals, room service or a home-cooked arrangement is available — ask when you enquire.",
  },
  {
    q: "Can you help arrange pooja at Baidyanath Dham?",
    a: "Yes — we can connect you with a Pandit we know personally, plus guidance on Shringar Puja timings and what samagri to carry.",
  },
  {
    q: "Is there 24-hour water and electricity?",
    a: "Yes, at every home we list — overhead tank plus inverter backup. Photographed in each home's own gallery.",
  },
  {
    q: "How many people fit in one 2BHK?",
    a: "Comfortably 6, with up to two extra mattresses at no charge on most homes. If your group is bigger, message us — we can often place a family across two flats in the same building.",
  },
  {
    q: "Do you arrange airport or station pickup?",
    a: "Yes. The price is fixed and told to you in advance — no haggling with a driver at midnight.",
  },
  {
    q: "Is a car available for Basukinath and Trikut?",
    a: "Yes, for a full day with a driver. The rate is fixed and told to you before you book.",
  },
  {
    q: "Can I book for Shravani Mela dates?",
    a: "Yes — book early, our homes are usually full months ahead through Shravan. Reserve with 25% advance and pay the balance on arrival: your written confirmation will be honoured. We do not cancel on guests, at any price.",
  },
] as const;

/**
 * S7 — lifted verbatim from the Kailasha Stays tenant page's own comparison
 * table (the same homepage_sections faq.content.comparisonRows already live
 * in production), per docs/apex-page-plan.md §S7: this is the one section
 * the strategy doc says to keep unchanged, because the "Cost for 6 people,
 * 3 nights: Mid" row — declining to claim the platform is cheapest — is the
 * most persuasive cell in the whole page.
 */
export const PLATFORM_COMPARISON_ROWS: {
  label: string;
  us: string;
  hotel: string;
  dharamshala: string;
}[] = [
  { label: "Whole family in one unit", us: "Yes", hotel: "No — 2–3 rooms", dharamshala: "Shared" },
  {
    label: "Induction hob for tea / baby food",
    us: "Yes",
    hotel: "No",
    dharamshala: "Rarely",
  },
  { label: "Private bathroom per family", us: "Yes — 2", hotel: "Yes", dharamshala: "Usually shared" },
  {
    label: "Price fixed in writing beforehand",
    us: "Yes",
    hotel: "Varies",
    dharamshala: "Varies",
  },
  { label: "Pickup & car arranged", us: "Yes", hotel: "Sometimes", dharamshala: "No" },
  { label: "Pooja assistance", us: "Yes", hotel: "No", dharamshala: "Yes" },
  {
    label: "Booking honoured in Shravan",
    us: "Guaranteed",
    hotel: "Often not",
    dharamshala: "First-come",
  },
  { label: "AC, hot water, power backup", us: "Yes", hotel: "Varies", dharamshala: "Rarely" },
  {
    label: "Cost for 6 people, 3 nights",
    us: "Mid",
    hotel: "Highest",
    dharamshala: "Cheapest",
  },
];

/** NAP for the footer and LocalBusiness schema. No street address is
 *  published anywhere in the database yet — omit rather than invent one. */
export const PLATFORM_NAP = {
  name: PLATFORM_NAME,
  locality: "Deoghar, Jharkhand",
  phone: PLATFORM_CONTACT_PHONE,
};

/**
 * Overrides the VISUAL identity fields of a tenant's site_settings with
 * Deoghar BnB's own, for a 'listing' (Plan A) tenant's guest portal (0027,
 * 0028, docs/tenant-plans-plan.md §6) — they have no site or branding of
 * their own, so a guest seeing their business_name/logo in the portal
 * chrome would be naming a business that exists nowhere else.
 *
 * Deliberately leaves whatsapp_number, contact_phone, contact_email and
 * address untouched: those are OPERATIONAL — the actual channel a guest
 * uses to reach the host servicing their actual stay — not branding, and
 * swapping them for the platform's own would break the guest's ability to
 * contact their host. Same operational-vs-branding split as
 * lib/platform.ts's getPlatformPropertyByPublicSlug().
 *
 * logo_path becomes null rather than a Deoghar BnB path: components/
 * site-header.tsx already falls back to the platform logo
 * (resolvePlatformLogoSrc()) whenever logo_path is null, so null triggers
 * exactly that fallback rather than hardcoding a second path to the same
 * asset. Favicon needs no equivalent override here — the guest portal has
 * never set its own `icons` metadata, so it already falls back to the root
 * layout's (now Deoghar BnB's own) /favicon.ico for every booking, branded
 * or not.
 */
export function withPlatformPortalBranding(settings: PublicSiteBranding): PublicSiteBranding {
  return {
    ...settings,
    business_name: PLATFORM_NAME,
    logo_path: null,
    brand_color: null,
    legal_name: null,
    footer_note: null,
  };
}
