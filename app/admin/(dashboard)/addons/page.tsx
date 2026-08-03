import type { Metadata } from "next";

import { AddonCatalogPanel } from "@/components/admin/settings/addon-catalog-panel";
import { listAllAddonServices } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Add-ons" };

/**
 * Its own destination rather than a section of Settings: the catalogue is
 * inventory the owner actively curates and prices, not a preference set once.
 * It's also referenced from two other places — each listing's Add-ons tab
 * picks from it, and the homepage's services strip renders the active ones —
 * so burying it under Settings understated what it is.
 */
export default async function AdminAddonsPage() {
  const addons = await listAllAddonServices();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Add-ons</h1>
      <p className="text-text-muted mt-1 max-w-2xl text-sm">
        Extras guests can add to a stay — car rental, pooja arrangements, meals. This is the shared
        catalogue; choose which of these each property actually offers from that listing&apos;s
        Add-ons tab. Active ones also appear on the homepage.
      </p>

      <div className="mt-6">
        <AddonCatalogPanel addons={addons} />
      </div>
    </div>
  );
}
