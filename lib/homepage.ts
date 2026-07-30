import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import {
  BUILTIN_SECTIONS,
  isLayoutType,
  layoutSchemas,
  type LayoutType,
} from "@/lib/homepage-blocks";

export type HomepageSectionRow = {
  id: string;
  key: string;
  kind: "builtin" | "custom";
  type: string;
  title: string | null;
  content: Record<string, unknown>;
  visible: boolean;
  locked: boolean;
  sort_order: number;
};

/**
 * The order the page shipped with, and the order it falls back to whenever the
 * homepage_sections table is unreachable or empty — a broken query must degrade
 * to the working page, never to a blank one.
 */
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

const LOCKED = new Set(["hero", "homes", "close"]);

function fallbackRows(): HomepageSectionRow[] {
  return DEFAULT_SECTION_ORDER.map((key, i) => ({
    id: key,
    key,
    kind: "builtin" as const,
    type: key,
    title: BUILTIN_SECTIONS[key]?.label ?? key,
    content: {},
    visible: true,
    locked: LOCKED.has(key),
    sort_order: i * 10,
  }));
}

/** A validated custom section, ready to render. */
export type CustomSection = {
  id: string;
  key: string;
  type: LayoutType;
  content: Record<string, unknown>;
};

export type HomepageLayout = {
  /** Every visible section in render order, builtins and customs interleaved. */
  order: HomepageSectionRow[];
  /** key -> sparse override map, for the builtin renderers. */
  overrides: Record<string, Record<string, string>>;
};

function readOverrides(content: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(content)) {
    // Blank strings mean "no override" so clearing a field in the admin form
    // restores the code default rather than rendering an empty heading.
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

export async function getHomepageLayout(): Promise<HomepageLayout> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("id,key,kind,type,title,content,visible,locked,sort_order")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  // Missing table (migration not yet applied) or any other failure: serve the
  // page exactly as it was before the builder existed.
  const rows: HomepageSectionRow[] =
    error || !data?.length ? fallbackRows() : (data as HomepageSectionRow[]);

  const overrides: Record<string, Record<string, string>> = {};
  const order: HomepageSectionRow[] = [];

  for (const row of rows) {
    if (row.kind === "builtin") {
      // An unknown builtin key means the code that rendered it is gone. Skip it
      // rather than crashing on a lookup that cannot succeed.
      if (!BUILTIN_SECTIONS[row.key]) continue;
      overrides[row.key] = readOverrides(row.content ?? {});
      order.push(row);
      continue;
    }

    // Custom sections are validated here, once, on the way out. A row that
    // fails its schema is dropped — a half-filled section the admin never
    // finished must not render as an empty band.
    if (!isLayoutType(row.type)) continue;
    if (!layoutSchemas[row.type].safeParse(row.content).success) continue;
    order.push(row);
  }

  return { order, overrides };
}

/**
 * Turns a section's sparse override map into a reader. The registry holds the
 * default, so a component asks for a field by name and never repeats the
 * default string inline — which is what keeps the admin form's placeholder and
 * the rendered output from drifting apart.
 */
export type Copy = (field: string, inlineDefault?: string) => string;

export function copyFor(
  sectionKey: string,
  overrides: Record<string, Record<string, string>>,
): Copy {
  const own = overrides[sectionKey] ?? {};
  const defaults = BUILTIN_SECTIONS[sectionKey]?.defaults ?? {};
  return (field, inlineDefault = "") => {
    const override = own[field];
    if (override) return override;
    const registered = defaults[field];
    // A registry default of "" means "this string is assembled from data at
    // render time" (a rate, a distance, a year), so the component passes its
    // own computed value as the inline default.
    return registered || inlineDefault;
  };
}

/** Image overrides are just strings — a storage path or a `/public` path. */
export function imageOverride(
  sectionKey: string,
  field: string,
  overrides: Record<string, Record<string, string>>,
): string | null {
  return overrides[sectionKey]?.[field] ?? null;
}
