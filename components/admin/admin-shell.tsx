"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Shield } from "lucide-react";

import { signOut } from "@/app/admin/(dashboard)/actions";
import {
  MOBILE_TABS,
  MORE_ITEM,
  isActive,
  isMoreRoute,
  navGroupsFor,
} from "@/lib/admin/nav";
import type { TenantPlan } from "@/lib/types/database";

export function AdminShell({
  userEmail,
  tenantName,
  isSuperadmin,
  plan,
  children,
}: {
  userEmail: string;
  /** Which business this session is acting on — only ambiguous once there's more than one. */
  tenantName: string;
  isSuperadmin: boolean;
  /** Drops Homepage from the Website group for a 'listing' tenant — see
   *  lib/admin/nav.ts's navGroupsFor(). */
  plan: TenantPlan;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navGroups = navGroupsFor(plan);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar — every destination, grouped by how often it's used. */}
      <aside className="border-border hidden w-64 shrink-0 flex-col border-r p-4 lg:flex">
        <p className="px-2 pt-2 font-semibold">Admin</p>
        <p className="text-text-muted truncate px-2 pb-2 text-sm">{tenantName}</p>

        <nav className="mt-3 flex flex-col gap-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-text-muted px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`pressable flex h-11 items-center gap-3 rounded-md px-3 font-medium ${
                        active ? "bg-primary-tint text-primary" : "hover:bg-surface-subtle"
                      }`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-border mt-auto border-t pt-3">
          {isSuperadmin ? (
            <Link
              href="/superadmin"
              className="hover:bg-surface-subtle pressable mb-1 flex h-11 items-center gap-3 rounded-md px-3 font-medium"
            >
              <Shield className="size-5" aria-hidden="true" />
              Platform
            </Link>
          ) : null}
          <p className="text-text-muted truncate px-2 text-sm">{userEmail}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="hover:bg-surface-subtle pressable mt-1 flex h-11 w-full items-center gap-3 rounded-md px-3 text-left font-medium"
            >
              <LogOut className="size-5" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar. Deliberately holds no navigation any more — the two
            unlabelled icons that used to live here (Homepage, Settings) were
            icon-only nav, which hurts discoverability; both are now labelled
            rows on the More tab instead. */}
        <header className="border-border bg-background sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <p className="font-semibold">Admin</p>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile tab bar — four daily destinations plus More, at the 5-item cap. */}
      <nav className="border-border bg-background fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_TABS.map((item) => {
          // The More tab stays lit while you're inside any screen it leads to,
          // so the bar never looks like nothing is selected.
          const active =
            item.href === MORE_ITEM.href
              ? isMoreRoute(pathname)
              : isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                active ? "text-primary" : "text-text-muted"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
