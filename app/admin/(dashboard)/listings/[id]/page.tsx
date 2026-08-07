import { notFound } from "next/navigation";

import {
  getPropertyForEdit,
  getSiteSettingsAdmin,
  listAddonsForProperty,
} from "@/lib/admin/queries";
import { PropertyEditor } from "@/components/admin/property-editor";
import { requireTenant } from "@/lib/admin/auth";
import { tenantSiteUrl } from "@/lib/tenant";

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

  return (
    <PropertyEditor
      property={property}
      addons={addons}
      settings={settings}
      siteUrl={tenantSiteUrl(tenant)}
    />
  );
}
