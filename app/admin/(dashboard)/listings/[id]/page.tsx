import { notFound } from "next/navigation";

import {
  getPropertyForEdit,
  getSiteSettingsAdmin,
  listAddonsForProperty,
} from "@/lib/admin/queries";
import { PropertyEditor } from "@/components/admin/property-editor";

export default async function EditListingPage(
  props: PageProps<"/admin/listings/[id]">,
) {
  const { id } = await props.params;
  const property = await getPropertyForEdit(id);
  if (!property) notFound();
  const [addons, settings] = await Promise.all([
    listAddonsForProperty(id),
    getSiteSettingsAdmin(),
  ]);

  return <PropertyEditor property={property} addons={addons} settings={settings} />;
}
