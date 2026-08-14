import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireTenant } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, tenant, isSuperadmin, isImpersonating } = await requireTenant();

  // The payment gate. Superadmins are exempt outright — including while
  // impersonating, since fixing a suspended tenant's data is exactly what
  // impersonation is for. /admin/billing lives outside this layout, so this
  // redirect can't loop.
  if (!isSuperadmin && tenant.status !== "active") {
    redirect("/admin/billing");
  }

  return (
    <>
      {isImpersonating ? <ImpersonationBanner tenantName={tenant.name} /> : null}
      <AdminShell
        userEmail={user.email ?? ""}
        tenantName={tenant.name}
        isSuperadmin={isSuperadmin}
        plan={tenant.plan}
      >
        {children}
      </AdminShell>
    </>
  );
}
