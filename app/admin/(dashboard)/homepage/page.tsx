import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";

import { requireTenant } from "@/lib/admin/auth";
import { HomepageShell } from "@/components/admin/homepage/homepage-shell";
import { getSiteSettingsAdmin } from "@/lib/admin/queries";
import { readHomepageSections } from "./actions";
import { readHomepageImages } from "./media-actions";

export const metadata: Metadata = { title: "Homepage" };

/**
 * notFound() for a 'listing' (Plan A) tenant — they have no homepage of
 * their own to edit (0027, docs/tenant-plans-plan.md §5). Gated here, not
 * just by hiding the nav link: a hidden link is not access control, and a
 * listing tenant typing this URL directly must not reach a working editor
 * for a page that isn't actually served anywhere.
 */
export default async function HomepageSettingsPage() {
  const { tenant } = await requireTenant();
  if (tenant.plan === "listing") notFound();

  const [sections, images, settings] = await Promise.all([
    readHomepageSections(),
    readHomepageImages(),
    getSiteSettingsAdmin(),
  ]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Homepage</h1>
          <p className="text-text-muted mt-1 max-w-2xl text-sm">
            Drag to reorder, rewrite any copy, upload photos, and add your own sections. Changes go live as soon as
            you save each one.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary pressable inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
        >
          View the homepage
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      {sections === null || images === null ? (
        // The builder's tables are the one thing here that need a migration,
        // so say exactly which file to run rather than showing a broken editor.
        <div className="border-warning/40 bg-warning/10 flex max-w-2xl gap-3 rounded-md border p-4">
          <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">One database step left.</p>
            <p className="mt-1">
              Open the Supabase SQL editor and run{" "}
              <code className="bg-surface rounded px-1 py-0.5 text-xs">
                supabase/migrations/0008_homepage_builder_v2.sql
              </code>
              , then reload this page. Until then the homepage renders its built-in layout, exactly as it does now.
            </p>
          </div>
        </div>
      ) : (
        <HomepageShell sections={sections} images={images} settings={settings} />
      )}
    </div>
  );
}
