import { EnquiriesList } from "@/components/admin/enquiries-list";
import { listAllAddonServices, listEnquiries } from "@/lib/admin/queries";

export default async function AdminEnquiriesPage() {
  const [enquiries, addons] = await Promise.all([
    listEnquiries(),
    listAllAddonServices(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Enquiries</h1>
      <p className="text-text-muted mt-1">
        Direct booking requests from the properties site.
      </p>

      <div className="mt-6">
        <EnquiriesList enquiries={enquiries} allAddons={addons} />
      </div>
    </div>
  );
}
