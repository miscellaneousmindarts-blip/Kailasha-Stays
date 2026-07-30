import type { Metadata } from "next";
import { AlertTriangle, ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { HomepageBuilder } from "@/components/admin/homepage/homepage-builder";
import type { ImageChoice } from "@/components/admin/homepage/image-picker";
import { readHomepageSections } from "./actions";

export const metadata: Metadata = { title: "Homepage" };

/**
 * The photo pool for every image field on the homepage: everything already
 * uploaded to a listing, labelled with its property and tag so a picker full of
 * similar bedrooms is still navigable.
 */
async function readImagePool(): Promise<ImageChoice[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_images")
    .select("storage_path,alt,tag,sort_order,properties(title)")
    .order("sort_order", { ascending: true });

  return (data ?? []).map((row) => {
    const property = (row.properties as { title?: string } | null)?.title;
    return {
      storage_path: row.storage_path,
      alt: row.alt ?? null,
      label: [property, row.tag, row.alt].filter(Boolean).join(" · ") || row.storage_path,
    };
  });
}

export default async function HomepageSettingsPage() {
  const [sections, pool] = await Promise.all([
    readHomepageSections(),
    readImagePool(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Homepage</h1>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          Reorder the homepage, hide what you don&apos;t want, rewrite any
          heading, and add your own sections.{" "}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary pressable inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            View the homepage
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </p>
      </div>

      {sections === null ? (
        // The builder's table is the one thing here that needs a migration, so
        // say exactly which file to run rather than showing an empty editor.
        <div className="border-warning/40 bg-warning/10 flex max-w-2xl gap-3 rounded-md border p-4">
          <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">One database step left.</p>
            <p className="mt-1">
              Open the Supabase SQL editor and run{" "}
              <code className="bg-surface rounded px-1 py-0.5 text-xs">
                supabase/migrations/0007_homepage_sections.sql
              </code>
              , then reload this page. Until then the homepage renders its
              built-in layout, exactly as it does now.
            </p>
          </div>
        </div>
      ) : (
        <HomepageBuilder sections={sections} pool={pool} />
      )}
    </div>
  );
}
