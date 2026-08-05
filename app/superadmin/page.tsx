import { TenantList } from "@/components/superadmin/tenant-list";
import { CreateTenantForm } from "@/components/superadmin/create-tenant-form";
import { ImpersonationLogPanel } from "@/components/superadmin/impersonation-log-panel";
import { listImpersonationLog, listTenants } from "@/lib/superadmin/queries";

export default async function SuperadminPage() {
  const [tenants, log] = await Promise.all([listTenants(), listImpersonationLog()]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          Every business on the platform. Only <strong>active</strong> tenants
          serve a public site — suspending one takes it offline immediately.
        </p>
        <div className="mt-6">
          <TenantList tenants={tenants} />
        </div>
      </div>

      <section className="border-border border-t pt-8">
        <h2 className="text-lg font-semibold">Add a tenant</h2>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          Creates the business and its settings row. It starts as{" "}
          <strong>invited</strong> with no public site until you activate it.
        </p>
        <div className="mt-4">
          <CreateTenantForm />
        </div>
      </section>

      <section className="border-border border-t pt-8">
        <h2 className="text-lg font-semibold">Recent support sessions</h2>
        <p className="text-text-muted mt-1 max-w-2xl text-sm">
          Every time someone acted as a tenant from here.
        </p>
        <div className="mt-4">
          <ImpersonationLogPanel entries={log} />
        </div>
      </section>
    </div>
  );
}
