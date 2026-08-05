import type { Metadata } from "next";

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

  return (
    <>
      {isImpersonating ? <ImpersonationBanner tenantName={tenant.name} /> : null}
      <AdminShell
        userEmail={user.email ?? ""}
        tenantName={tenant.name}
        isSuperadmin={isSuperadmin}
      >
        {children}
      </AdminShell>
    </>
  );
}
