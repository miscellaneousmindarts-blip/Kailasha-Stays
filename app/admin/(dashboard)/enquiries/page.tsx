import { EnquiriesList } from "@/components/admin/enquiries-list";
import {
  listAllAddonServices,
  listEnquiries,
  listPropertyPricing,
} from "@/lib/admin/queries";

export default async function AdminEnquiriesPage() {
  const [enquiries, addons, pricing] = await Promise.all([
    listEnquiries(),
    listAllAddonServices(),
    listPropertyPricing(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Enquiries</h1>
      <p className="text-text-muted mt-1">
        Direct booking requests from the properties site.
      </p>

      <div className="mt-6">
        <EnquiriesList enquiries={enquiries} allAddons={addons} pricing={pricing} />
      </div>
    </div>
  );
}
