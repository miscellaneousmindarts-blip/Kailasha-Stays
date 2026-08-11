import { z } from "zod";
import {
  AlignLeft,
  HelpCircle,
  Image as ImageIcon,
  Images,
  Link2,
  List,
  MapPin,
  Table2,
  type LucideIcon,
} from "lucide-react";

import type { SectionAudience } from "@/lib/types/database";

/**
 * The block registry — the whole point of the page builder.
 *
 * Adding a new kind of property detail means adding one entry here, one
 * renderer in components/blocks/, and one editor in
 * components/admin/block-editors/. No database migration: property_sections.type
 * is a free text column on purpose.
 *
 * Every block's content is validated with its zod schema on the way in (admin
 * save) and on the way out (rendering), so a malformed row can never crash a
 * page — it is simply skipped.
 */

const imageRef = z.object({
  storage_path: z.string().min(1),
  alt: z.string().nullish(),
});

export const blockSchemas = {
  paragraph: z.object({
    text: z.string().min(1),
  }),

  list: z.object({
    style: z.enum(["bullet", "check", "number"]).default("bullet"),
    items: z.array(z.string().min(1)).min(1),
  }),

  image: imageRef.extend({
    caption: z.string().nullish(),
  }),

  gallery: z.object({
    images: z.array(imageRef).min(1),
  }),

  link_list: z.object({
    links: z
      .array(
        z.object({
          label: z.string().min(1),
          url: z.string().url(),
          note: z.string().nullish(),
        }),
      )
      .min(1),
  }),

  key_value: z.object({
    rows: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
        }),
      )
      .min(1),
  }),

  /**
   * Distances to nearby landmarks, laid out as a photo bento — the property
   * page's counterpart to the homepage's "Where you'll be" tiles, using the
   * property's own uploaded photos rather than the homepage's separate media
   * library. Capped at 5: the whole point of a bento is one clear layout per
   * count, and DistancesEditor/DistancesBlock only define layouts for 1–5.
   */
  distances: z.object({
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          image: imageRef.nullish(),
        }),
      )
      .min(1)
      .max(5),
  }),

  faq: z.object({
    items: z
      .array(
        z.object({
          q: z.string().min(1),
          a: z.string().min(1),
        }),
      )
      .min(1),
  }),
} as const;

export type BlockType = keyof typeof blockSchemas;

export type BlockContent<T extends BlockType> = z.infer<(typeof blockSchemas)[T]>;

/** UI metadata for the admin "Add section" picker. */
export const BLOCK_TYPES: Record<
  BlockType,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    empty: unknown;
    /**
     * Who a freshly added section of this type shows to, before the admin
     * touches the "Show to" control. Everything defaults to "public" — a new
     * section is marketing copy until an admin says otherwise — except
     * distances, which is travel info a guest who already booked needs just
     * as much as a browsing visitor, so it starts on both rather than
     * requiring the same manual flip every time one gets added.
     */
    defaultAudience: SectionAudience;
  }
> = {
  paragraph: {
    label: "Paragraph",
    description: "A block of text, e.g. how to get here from the station.",
    icon: AlignLeft,
    empty: { text: "" },
    defaultAudience: "public",
  },
  list: {
    label: "List",
    description: "Bullets, ticks or numbered steps.",
    icon: List,
    empty: { style: "check", items: [""] },
    defaultAudience: "public",
  },
  key_value: {
    label: "Facts table",
    description: "Label and value pairs, plain text.",
    icon: Table2,
    empty: { rows: [{ label: "", value: "" }] },
    defaultAudience: "public",
  },
  distances: {
    label: "Distances (photo grid)",
    description: "Nearby landmarks as a photo bento — up to 5, each with an optional photo.",
    icon: MapPin,
    empty: { items: [{ label: "", value: "", image: null }] },
    defaultAudience: "both",
  },
  faq: {
    label: "Questions",
    description: "Expandable question and answer pairs.",
    icon: HelpCircle,
    empty: { items: [{ q: "", a: "" }] },
    defaultAudience: "public",
  },
  image: {
    label: "Single photo",
    description: "One wide photo with an optional caption.",
    icon: ImageIcon,
    empty: { storage_path: "", alt: "" },
    defaultAudience: "public",
  },
  gallery: {
    label: "Photo grid",
    description: "A grid of photos, e.g. the rooftop or the kitchen.",
    icon: Images,
    empty: { images: [] },
    defaultAudience: "public",
  },
  link_list: {
    label: "Links",
    description: "Useful links, e.g. nearby restaurants on Google Maps.",
    icon: Link2,
    empty: { links: [{ label: "", url: "" }] },
    defaultAudience: "public",
  },
};

export const BLOCK_TYPE_LIST = Object.keys(BLOCK_TYPES) as BlockType[];

export function isKnownBlockType(type: string): type is BlockType {
  return type in blockSchemas;
}

/**
 * Validates a section row. Returns null for unknown types or malformed content
 * so callers can skip it instead of throwing.
 */
export function parseBlock(
  type: string,
  content: unknown,
): { type: BlockType; content: unknown } | null {
  if (!isKnownBlockType(type)) return null;
  const result = blockSchemas[type].safeParse(content);
  if (!result.success) return null;
  return { type, content: result.data };
}
