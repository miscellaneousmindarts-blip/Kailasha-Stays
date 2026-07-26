import { notFound } from "next/navigation";

import { getPropertyForEdit } from "@/lib/admin/queries";
import { PropertyEditor } from "@/components/admin/property-editor";

export default async function EditListingPage(
  props: PageProps<"/admin/listings/[id]">,
) {
  const { id } = await props.params;
  const property = await getPropertyForEdit(id);
  if (!property) notFound();

  return <PropertyEditor property={property} />;
}
