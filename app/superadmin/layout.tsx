import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSuperadmin } from "@/lib/superadmin/queries";

export const metadata: Metadata = {
  title: "Platform",
  robots: { index: false, follow: false },
};

/**
 * Gated here rather than per-page so a new console route can't be added
 * without the check — the same reason the tenant layout resolves its tenant
 * once at the boundary.
 */
export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSuperadmin();

  return (
    <div className="min-h-dvh">
      <header className="border-border bg-foreground text-background border-b">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <p className="font-semibold">Platform</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden opacity-70 sm:inline">{user.email}</span>
            <Link
              href="/admin"
              className="pressable flex items-center gap-1.5 font-medium hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page py-8">{children}</main>
    </div>
  );
}
