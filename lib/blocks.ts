import { z } from "zod";
import {
  AlignLeft,
  HelpCircle,
  Image as ImageIcon,
  Images,
  Link2,
  List,
  Table2,
  type LucideIcon,
} from "lucide-react";

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
  { label: string; description: string; icon: LucideIcon; empty: unknown }
> = {
  paragraph: {
    label: "Paragraph",
    description: "A block of text, e.g. how to get here from the station.",
    icon: AlignLeft,
    empty: { text: "" },
  },
  list: {
    label: "List",
    description: "Bullets, ticks or numbered steps.",
    icon: List,
    empty: { style: "check", items: [""] },
  },
  key_value: {
    label: "Facts table",
    description: "Label and value pairs, e.g. distances to temples.",
    icon: Table2,
    empty: { rows: [{ label: "", value: "" }] },
  },
  faq: {
    label: "Questions",
    description: "Expandable question and answer pairs.",
    icon: HelpCircle,
    empty: { items: [{ q: "", a: "" }] },
  },
  image: {
    label: "Single photo",
    description: "One wide photo with an optional caption.",
    icon: ImageIcon,
    empty: { storage_path: "", alt: "" },
  },
  gallery: {
    label: "Photo grid",
    description: "A grid of photos, e.g. the rooftop or the kitchen.",
    icon: Images,
    empty: { images: [] },
  },
  link_list: {
    label: "Links",
    description: "Useful links, e.g. nearby restaurants on Google Maps.",
    icon: Link2,
    empty: { links: [{ label: "", url: "" }] },
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
