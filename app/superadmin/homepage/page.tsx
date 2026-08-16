import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { PlatformHomepageShell } from "@/components/superadmin/homepage/platform-shell";
import { PLATFORM_SECTION_EDITORS } from "@/components/superadmin/homepage/editors";
import { readPlatformSections } from "./actions";
import { readPlatformImages } from "./media-actions";

export const metadata: Metadata = { title: "Apex homepage" };

/**
 * requireSuperadmin() gates this at the layout (app/superadmin/layout.tsx),
 * same pattern as the tenant homepage builder gating on requireTenant() —
 * there is no additional per-page check needed here.
 */
export default async function PlatformHomepagePage() {
  const [sections, images] = await Promise.all([readPlatformSections(), readPlatformImages()]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Apex homepage</h1>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          Drag to reorder, rewrite any copy, and upload photos. Changes go live on{" "}
          deogharbnb.space as soon as you save each section.
        </p>
      </div>

      {sections === null || images === null ? (
        <div className="border-warning/40 bg-warning/10 flex max-w-2xl gap-3 rounded-md border p-4">
          <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">One database step left.</p>
            <p className="mt-1">
              Open the Supabase SQL editor and run{" "}
              <code className="bg-surface rounded px-1 py-0.5 text-xs">
                supabase/migrations/0029_platform_sections.sql
              </code>
              , then reload this page. Until then the apex homepage renders its built-in copy, exactly as it does
              now.
            </p>
          </div>
        </div>
      ) : (
        <PlatformHomepageShell sections={sections} images={images} editors={PLATFORM_SECTION_EDITORS} />
      )}
    </div>
  );
}
