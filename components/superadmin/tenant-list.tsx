import { TenantCard } from "@/components/superadmin/tenant-card";
import type { TenantRow } from "@/lib/superadmin/types";

export function TenantList({ tenants }: { tenants: TenantRow[] }) {
  if (!tenants.length) {
    return (
      <div className="border-border rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">No tenants yet</p>
        <p className="text-text-muted mt-1 text-sm">Add the first one below.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {tenants.map((t) => (
        <TenantCard key={t.id} tenant={t} />
      ))}
    </ul>
  );
}
