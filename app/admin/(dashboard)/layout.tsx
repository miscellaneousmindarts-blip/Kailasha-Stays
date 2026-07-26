import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return <AdminShell userEmail={user.email ?? ""}>{children}</AdminShell>;
}
