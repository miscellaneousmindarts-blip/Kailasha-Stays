import { z } from "zod";
import {
  Columns2,
  Image as ImageIcon,
  LayoutGrid,
  Quote,
  Sigma,
  type LucideIcon,
} from "lucide-react";

/**
 * The homepage builder's registry.
 *
 * Two halves, because the homepage has two kinds of section:
 *
 *   BUILTIN_SECTIONS — sections whose markup lives in components/landing/. The
 *   admin controls their order and visibility and may override individual
 *   strings and images. The defaults live HERE, not inline in the components,
 *   so the admin form and the renderer can never disagree about what the
 *   default is: the form shows `defaults[field]` as its placeholder and the
 *   renderer falls back to the same value.
 *
 *   LAYOUTS — templates for sections the admin composes from scratch. These
 *   have no code default; the row is the whole section.
 *
 * Every override value is a plain string. Image fields hold a Supabase storage
 * path or a `/public` path, which is exactly what imageUrl() already accepts,
 * so images need no separate shape.
 */

export type FieldKind = "text" | "textarea" | "image";

export type SectionField = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Shown under the input in the admin form when the field needs context. */
  hint?: string;
};

export type BuiltinSection = {
  label: string;
  /** One line telling the admin what this section is for, in the builder list. */
  note: string;
  fields: SectionField[];
  /** Field key -> the string the component renders when there is no override. */
  defaults: Record<string, string>;
};

const t = (key: string, label: string, hint?: string): SectionField => ({
  key,
  label,
  kind: "text",
  ...(hint ? { hint } : {}),
});
const ta = (key: string, label: string, hint?: string): SectionField => ({
  key,
  label,
  kind: "textarea",
  ...(hint ? { hint } : {}),
});
const img = (key: string, label: string, hint?: string): SectionField => ({
  key,
  label,
  kind: "image",
  ...(hint ? { hint } : {}),
});

export const BUILTIN_SECTIONS: Record<string, BuiltinSection> = {
  hero: {
    label: "Hero",
    note: "The first screen. Cannot be hidden or moved.",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("headingHi", "Heading (Hindi)"),
      t("heading", "Heading (English)", "Only used for direct visitors — ad traffic with ?src= gets its own headline."),
      ta("lede", "Sub-heading"),
      t("ctaLabelHi", "Button label (Hindi)"),
      t("ctaLabel", "Button label (English)"),
      img("image", "Background photo"),
    ],
    defaults: {
      eyebrow: "Deoghar · Jharkhand",
      headingHi: "आपके परिवार के लिए देवघर में एक अपना घर",
      heading: "",
      lede: "",
      ctaLabelHi: "घर देखिए",
      ctaLabel: "View our homes",
      image: "",
    },
  },

  trust_ribbon: {
    label: "Trust ribbon",
    note: "The thin row of reassurances under the hero.",
    fields: [],
    defaults: {},
  },

  map: {
    label: "Where you'll be",
    note: "Map tile plus the three nearest landmarks. Distances come from the property's own Distances section.",
    fields: [
      t("heading", "Heading"),
      ta("sub", "Sub-line", "Appears over the map image."),
      img(
        "landmark1",
        "Photo for landmark 1",
        "Slots are positional — landmark 1 is the first row of the property's Distances section, not a named place. Reorder those rows and these photos stay where they are.",
      ),
      img("landmark2", "Photo for landmark 2"),
      img("landmark3", "Photo for landmark 3"),
    ],
    defaults: {
      heading: "Where you'll be",
      sub: "every distance below measured from our door",
    },
  },

  homes: {
    label: "Our homes",
    note: "The property cards. Cannot be hidden — it is where the primary button points.",
    fields: [t("eyebrowHi", "Eyebrow (Hindi)"), t("eyebrow", "Eyebrow"), t("heading", "Heading"), ta("lede", "Sub-heading")],
    defaults: {
      eyebrowHi: "हमारे घर",
      eyebrow: "Our homes",
      heading: "",
      lede: "",
    },
  },

  why_apartment: {
    label: "Why a 2BHK + price calculator",
    note: "One short argument, then the saving calculator.",
    fields: [t("heading", "Heading"), ta("body", "Body copy")],
    defaults: {
      heading: "Why a 2BHK apartment is better than three hotel rooms",
      body: "Six people in a hotel means three rooms, three bills and three sets of keys. Here it's one flat, one price, and nobody sleeping in a corridor away from their family. It usually costs less, too. Don't take our word for it — put your own numbers in.",
    },
  },

  meet_host: {
    label: "Meet your host",
    note: "Hidden automatically until a host name is set in landing-config.",
    fields: [t("eyebrow", "Eyebrow"), t("heading", "Heading"), ta("body", "Body copy"), img("image", "Host photo")],
    defaults: { eyebrow: "", heading: "", body: "", image: "" },
  },

  nothing_hidden: {
    label: "Nothing hidden (photo grid)",
    note: "The full-width photo grid of the parts other listings skip.",
    fields: [
      t("heading", "Heading"),
      ta("lede", "Sub-heading"),
      img("image1", "Photo 1 (large)"),
      img("image2", "Photo 2"),
      img("image3", "Photo 3"),
      img("image4", "Photo 4"),
      img("image5", "Photo 5"),
      img("image6", "Photo 6"),
    ],
    defaults: {
      heading: "We photograph the parts other listings don't.",
      lede: "",
    },
  },

  proof: {
    label: "Reviews and proof",
    note: "Renders only what real review data exists. Never invents numbers.",
    fields: [t("heading", "Heading")],
    defaults: { heading: "" },
  },

  services: {
    label: "Add-on services",
    note: "Pulls the first three active add-ons from the add-on catalogue.",
    fields: [ta("note", "Closing line")],
    defaults: { note: "All arranged on the same WhatsApp thread as your stay." },
  },

  shravan: {
    label: "Shravan notice",
    note: "The dark seasonal band about booking early.",
    fields: [t("eyebrow", "Eyebrow"), t("heading", "Heading"), ta("body", "Paragraph"), ta("promise", "Emphasised paragraph")],
    defaults: {
      eyebrow: "Shravan · July–August",
      heading: "Shravani Mela — please book early.",
      body: "Deoghar receives over 40 lakh devotees through Shravan. Our homes are usually full months ahead.",
      promise: "",
    },
  },

  faq: {
    label: "FAQ",
    note: "Questions come from the FAQ builder and feed the page's search-result markup.",
    fields: [t("heading", "Heading")],
    defaults: { heading: "The things families actually ask us" },
  },

  close: {
    label: "Closing CTA",
    note: "The last screen. Cannot be hidden or moved.",
    fields: [t("headingHi", "Heading (Hindi)"), t("heading", "Heading (English)"), ta("body", "Body copy")],
    defaults: { headingHi: "अपना घर चुनिए।", heading: "", body: "" },
  },
};

/* ------------------------------------------------------------------ */
/* Custom section layouts                                             */
/* ------------------------------------------------------------------ */

const imageRef = z.object({
  storage_path: z.string().min(1),
  alt: z.string().nullish(),
});

/** Which band the section paints itself on, so custom sections alternate like the built-in ones do. */
const band = z.enum(["canvas", "sand", "ink"]).default("canvas");

export const layoutSchemas = {
  /** Image one side, words the other. The workhorse. */
  split: z.object({
    band,
    heading: z.string().min(1),
    body: z.string().nullish(),
    bullets: z.array(z.string().min(1)).default([]),
    image: imageRef.nullish(),
    imageSide: z.enum(["left", "right"]).default("left"),
  }),

  /** Full-bleed photo, dark scrim, words on top. Use sparingly — it is loud. */
  feature_band: z.object({
    heading: z.string().min(1),
    body: z.string().nullish(),
    image: imageRef.nullish(),
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
          image: imageRef.nullish(),
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
      return { band: "canvas", heading: "", body: "", bullets: [], image: null, imageSide: "left" };
    case "feature_band":
      return { heading: "", body: "", image: null, ctaLabel: "", ctaHref: "" };
    case "bento":
      return {
        band: "canvas",
        heading: "",
        tiles: [{ heading: "", body: "", image: null, wide: true, tone: "dark" }],
      };
    case "stat_row":
      return { band: "sand", heading: "", stats: [{ figure: "", label: "" }, { figure: "", label: "" }] };
    case "quote":
      return { band: "sand", quote: "", attribution: "", role: "" };
  }
}
