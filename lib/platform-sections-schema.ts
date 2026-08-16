import { z } from "zod";
import {
  Banknote,
  Calculator,
  Car,
  CarFront,
  Flame,
  HandHeart,
  Home as HomeIcon,
  LayoutTemplate,
  MapPin,
  MessageSquareQuote,
  MessagesSquare,
  Sparkles,
  Star,
  UtensilsCrossed,
  Landmark,
  PlaneTakeoff,
  TrainFront,
  type LucideIcon,
} from "lucide-react";

/**
 * The client-safe half of the apex homepage's content model: the zod schemas
 * (and everything derived from them) that both the server-only resolver
 * (lib/platform-sections.ts) and the browser-rendered editors
 * (components/superadmin/homepage/editors.tsx, platform-shell.tsx) need.
 *
 * Split out specifically because lib/platform-sections.ts is `server-only`
 * (it imports the Supabase client and a `node:fs`-touching asset resolver) —
 * a "use client" file importing even one VALUE from it (not just a type)
 * pulls that whole chain into the browser bundle and fails the build. Same
 * split as lib/homepage-blocks.ts (client-safe) vs lib/homepage.ts
 * (server-only) for the tenant builder.
 *
 * See docs/apex-homepage-editor-plan.md §3 for why every schema below
 * `.default()`s to the exact copy already hardcoded across
 * components/platform/*.tsx and lib/platform-content.ts, rather than to an
 * empty string.
 */

/** A reference into the platform_images library, or none. */
const imageId = z.string().uuid().nullable().default(null);

export const platformSectionSchemas = {
  hero: z.object({
    eyebrow: z.string().default("देवघर · झारखंड"),
    headingHi: z.string().default("अपने परिवार के लिए देवघर में एक अपना घर"),
    heading: z
      .string()
      .default("Whole-flat homestays in Deoghar, minutes from Baba Baidyanath Dham"),
    lede: z
      .string()
      .default(
        "Verified homes from local families. The whole flat is yours — not a hotel room, not shared. Fixed price in writing, free cancellation, and pooja, pickup and car arranged before you arrive.",
      ),
    ctaLabelHi: z.string().default("घर देखिए"),
    ctaLabel: z.string().default("Find your stay"),
    waCtaLabel: z.string().default("WhatsApp us"),
    // Falls back to resolvePlatformHeroImage()'s filesystem check when unset
    // — see resolveHero() in lib/platform-sections.ts. Uploading one here
    // takes priority.
    imageId,
    trustItems: z
      .array(z.string().min(1))
      .default(["Verified local hosts", "Free cancellation", "Replies in ~15 min", "No hidden charges"]),
  }),

  homes: z.object({
    eyebrowHi: z.string().default("हमारे घर"),
    eyebrow: z.string().default("Our verified homes in Deoghar"),
    lede: z
      .string()
      .default(
        "Every home is visited and verified by us. Real photos, real prices, and a direct line to the family who runs it.",
      ),
  }),

  savings: z.object({
    heading: z.string().default("Why one 2BHK beats three hotel rooms"),
    lede: z
      .string()
      .default(
        "Six people in a hotel means three rooms, three bills and three sets of keys. One 2BHK flat means you pay less and everyone stays together. Don't take our word for it — put your own numbers in.",
      ),
  }),

  location: z.object({
    eyebrowHi: z.string().default("देवघर में आपका ठिकाना"),
    eyebrow: z.string().default("Where you'll be"),
    // Split around the walk-time figure rather than one templated sentence,
    // so "{n}-minute walk" can stay styled (text-primary span) exactly as
    // before — see resolveLocation()'s comment. The number itself is
    // computed from live property data (app/(platform)/page.tsx), not
    // stored, so the promise can never quietly become false as homes are
    // added.
    promiseBefore: z.string().default("Every home we list is within a"),
    promiseAfter: z.string().default("of Baba Baidyanath Dham — most are far closer."),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          range: z.string().min(1),
          note: z.string().default(""),
          icon: z.enum(["landmark", "train", "plane", "car"]).default("landmark"),
        }),
      )
      .default([
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
      ]),
    footNote: z
      .string()
      .default("Every home's own page lists its exact distance, measured from that door."),
  }),

  comparison: z.object({
    heading: z.string().default("Us, a hotel, or a dharamshala — an honest comparison"),
    lede: z
      .string()
      .default(
        "A dharamshala is the cheapest option and we won't pretend otherwise. Here's exactly what's different.",
      ),
    // §7 of the plan doc: the strategy doc singles this table out to keep
    // unchanged — "Cost for 6 people, 3 nights: Mid" conceding rather than
    // claiming cheapest is the most persuasive cell in it. Still editable:
    // that argument is a reason to default it faithfully, not to lock it.
    rows: z
      .array(
        z.object({
          label: z.string().min(1),
          us: z.string().default(""),
          hotel: z.string().default(""),
          dharamshala: z.string().default(""),
        }),
      )
      .default([
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
      ]),
  }),

  what_we_arrange: z.object({
    eyebrowHi: z.string().default("दर्शन, गाड़ी, पूजा — सब हम देख लेंगे"),
    eyebrow: z.string().default("Darshan, car, pooja — we'll handle it"),
    items: z
      .array(
        z.object({
          icon: z.enum(["flame", "car", "car-front", "utensils"]).default("flame"),
          title: z.string().min(1),
          body: z.string().default(""),
        }),
      )
      .default([
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
      ]),
    footNote: z.string().default("All arranged on the same WhatsApp thread as your stay."),
  }),

  social_proof: z.object({
    eyebrow: z.string().default("What families tell us afterwards"),
    // Deliberately no aggregate rating field — lib/platform-content.ts's
    // original comment stands: no platform-wide figure exists anywhere in
    // the database to back one, so none is offered here to fill in.
    reviews: z
      .array(
        z.object({
          name: z.string().min(1),
          quote: z.string().min(1),
          stars: z.number().int().min(1).max(5).default(5),
        }),
      )
      .default([
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
      ]),
  }),

  host_band: z.object({
    eyebrow: z.string().default("Deoghar property owners"),
    heading: z.string().default("Have a flat in Deoghar? Let it earn between visits."),
    // Two paragraphs, split on a blank line — same shape as meet_host.body in
    // the tenant builder (resolveProse), not two separate fields, so an
    // owner can add or remove a paragraph without a schema change.
    body: z
      .string()
      .default(
        "We list, photograph, price and market your property — and send you guests directly, with no commission to a foreign platform. You keep control of your calendar and your rates.\n\nWe're onboarding a limited number of homes near Baba Baidyanath Dham.",
      ),
    proofPoints: z
      .array(
        z.object({
          icon: z.enum(["template", "chat", "money"]).default("template"),
          label: z.string().min(1),
        }),
      )
      .default([
        { icon: "template", label: "Your own branded booking page" },
        { icon: "chat", label: "We handle photos, pricing & enquiries" },
        { icon: "money", label: "Guests pay you directly" },
      ]),
    ctaLabel: z.string().default("List your property →"),
    // Prefilled into the WhatsApp message behind the primary CTA.
    ctaWaMessage: z.string().default("I have a property in Deoghar I'd like to list."),
    secondaryCtaLabel: z.string().default("Talk to us on WhatsApp"),
  }),

  faq: z.object({
    heading: z.string().default("The things families actually ask us"),
    items: z
      .array(
        z.object({
          q: z.string().min(1),
          a: z.string().min(1),
          // Unlike the tenant FAQ, "comparison" here is text-only styling —
          // the full comparison table already has its own section (§comparison)
          // so this never embeds the table a second time.
          comparison: z.boolean().default(false),
        }),
      )
      .default([
        {
          q: "How far are your homes from Baidyanath Dham temple?",
          a: "Every home we list is within a 25-minute walk of the temple — most are far closer. Each home's own page lists its exact distance, measured from that door.",
          comparison: false,
        },
        {
          q: "What if I pay the advance and something goes wrong?",
          a: "Free cancellation up to 7 days before check-in with a full refund. Only 25% upfront, balance on arrival.",
          comparison: false,
        },
        {
          q: "Will the price change after I book?",
          a: "No. The rate we send you in writing is the rate you pay. Festival dates cost more and we tell you that upfront — never as a surprise at check-in.",
          comparison: false,
        },
        {
          q: "Is it suitable for elderly parents?",
          a: "Most homes offer a ground-floor option, a Western toilet with a grab bar, hot water 24×7, and parking at the door. Tell us their needs when you enquire and we'll match you to the right home.",
          comparison: false,
        },
        {
          q: "How does this compare to a hotel or a dharamshala?",
          a: "A dharamshala is the cheapest option and we won't pretend otherwise. What you get here instead is the whole flat for your family, a private bathroom, a price fixed in writing, and a booking we will not cancel during Shravan.",
          comparison: true,
        },
        {
          q: "Can we cook our own food?",
          a: "Not a full kitchen — we don't want to promise one we don't have. Most homes have an induction hob for the basics: tea, coffee, warming milk or baby food. For full meals, room service or a home-cooked arrangement is available — ask when you enquire.",
          comparison: false,
        },
        {
          q: "Can you help arrange pooja at Baidyanath Dham?",
          a: "Yes — we can connect you with a Pandit we know personally, plus guidance on Shringar Puja timings and what samagri to carry.",
          comparison: false,
        },
        {
          q: "Is there 24-hour water and electricity?",
          a: "Yes, at every home we list — overhead tank plus inverter backup. Photographed in each home's own gallery.",
          comparison: false,
        },
        {
          q: "How many people fit in one 2BHK?",
          a: "Comfortably 6, with up to two extra mattresses at no charge on most homes. If your group is bigger, message us — we can often place a family across two flats in the same building.",
          comparison: false,
        },
        {
          q: "Do you arrange airport or station pickup?",
          a: "Yes. The price is fixed and told to you in advance — no haggling with a driver at midnight.",
          comparison: false,
        },
        {
          q: "Is a car available for Basukinath and Trikut?",
          a: "Yes, for a full day with a driver. The rate is fixed and told to you before you book.",
          comparison: false,
        },
        {
          q: "Can I book for Shravani Mela dates?",
          a: "Yes — book early, our homes are usually full months ahead through Shravan. Reserve with 25% advance and pay the balance on arrival: your written confirmation will be honoured. We do not cancel on guests, at any price.",
          comparison: false,
        },
      ]),
    footNote: z.string().default("Still have a question? Just ask — we don't mind."),
    waLabel: z.string().default("Ask on WhatsApp"),
  }),

  final_cta: z.object({
    headingHi: z.string().default("अपना घर चुनिए।"),
    heading: z.string().default("Pick your home. We'll do the rest."),
    lede: z
      .string()
      .default(
        "Every home has its own page with full photos, the exact price, and a direct WhatsApp line to the family who runs it.",
      ),
    primaryCtaLabel: z.string().default("See all stays"),
    waCtaLabel: z.string().default("WhatsApp us"),
  }),
} as const;

export type PlatformSectionKey = keyof typeof platformSectionSchemas;

export function isPlatformSectionKey(key: string): key is PlatformSectionKey {
  return key in platformSectionSchemas;
}

export type PlatformSectionContent<K extends PlatformSectionKey> = z.infer<
  (typeof platformSectionSchemas)[K]
>;

/* ------------------------------------------------------------------ */
/* Icon registries — shared between the resolvers (lib/platform-       */
/* sections.ts) and the editors, so the enum values and their glyphs   */
/* stay declared in exactly one place.                                 */
/* ------------------------------------------------------------------ */

export const LOCATION_ICONS = { landmark: Landmark, train: TrainFront, plane: PlaneTakeoff, car: Car } as const;
export const WHAT_WE_ARRANGE_ICONS = {
  flame: Flame,
  car: Car,
  "car-front": CarFront,
  utensils: UtensilsCrossed,
} as const;
export const HOST_BAND_ICONS = { template: LayoutTemplate, chat: MessagesSquare, money: Banknote } as const;

/**
 * Outline-list label/note/icon per section, for the superadmin builder —
 * same purpose as BUILTIN_META in lib/homepage-blocks.ts.
 */
export const PLATFORM_SECTION_META: Record<PlatformSectionKey, { label: string; note: string; icon: LucideIcon }> = {
  hero: { label: "Hero", note: "The first screen.", icon: Sparkles },
  homes: { label: "Homes grid", note: "The property cards. Filter chips are computed, not editable.", icon: HomeIcon },
  savings: { label: "Savings calculator", note: "Heading and lede only — the calculator itself uses live rates.", icon: Calculator },
  location: { label: "Where you'll be", note: "The walk-time promise and the four landmark tiles.", icon: MapPin },
  comparison: { label: "Comparison table", note: "Us vs. hotel vs. dharamshala.", icon: MessageSquareQuote },
  what_we_arrange: { label: "What we arrange", note: "Pooja, pickup, car, food.", icon: HandHeart },
  social_proof: { label: "Reviews", note: "Hidden entirely if you remove every review.", icon: Star },
  host_band: { label: "For property owners", note: "The dark band pitching hosts to list with us.", icon: LayoutTemplate },
  faq: { label: "FAQ", note: "Also feeds the page's FAQPage structured data.", icon: MessageSquareQuote },
  final_cta: { label: "Closing CTA", note: "The last screen.", icon: Sparkles },
};
