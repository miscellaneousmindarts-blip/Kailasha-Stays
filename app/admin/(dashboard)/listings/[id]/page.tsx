import { notFound } from "next/navigation";

import {
  getPropertyForEdit,
  getSiteSettingsAdmin,
  listAddonsForProperty,
} from "@/lib/admin/queries";
import { PropertyEditor } from "@/components/admin/property-editor";
import { requireTenant } from "@/lib/admin/auth";
import { tenantSiteUrl } from "@/lib/tenant";
import { PLATFORM_SITE_URL } from "@/lib/platform-content";

export default async function EditListingPage(
  props: PageProps<"/admin/listings/[id]">,
) {
  const { id } = await props.params;
  const property = await getPropertyForEdit(id);
  if (!property) notFound();
  const [addons, settings, { tenant }] = await Promise.all([
    listAddonsForProperty(id),
    getSiteSettingsAdmin(),
    requireTenant(),
  ]);

  // A 'listing' (Plan A) tenant has no site of their own — the apex's
  // /stays/[slug] is the only place this property is actually reachable
  // (0027, docs/tenant-plans-plan.md). Computed here, where both the
  // tenant's plan and the property's public_slug are already in hand,
  // rather than inside StatusControls/PropertyEditor, which shouldn't need
  // to know which plan they're looking at.
  const { liveUrl, liveLabel } =
    tenant.plan === "listing"
      ? {
          liveUrl: `${PLATFORM_SITE_URL}/stays/${property.public_slug}`,
          liveLabel: `/stays/${property.public_slug}`,
        }
      : {
          liveUrl: `${tenantSiteUrl(tenant)}/properties/${property.slug}`,
          liveLabel: `/properties/${property.slug}`,
        };

  return (
    <PropertyEditor
      property={property}
      addons={addons}
      settings={settings}
      liveUrl={liveUrl}
      liveLabel={liveLabel}
    />
  );
}
