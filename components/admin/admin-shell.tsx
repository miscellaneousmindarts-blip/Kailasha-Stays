"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, LogOut } from "lucide-react";

import { signOut } from "@/app/admin/(dashboard)/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Home },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh">
      {/* desktop sidebar */}
      <aside className="border-border hidden w-64 shrink-0 flex-col border-r p-4 lg:flex">
        <p className="px-2 py-2 font-semibold">Admin</p>
        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pressable flex h-11 items-center gap-3 rounded-md px-3 font-medium ${
                  active
                    ? "bg-primary-tint text-primary"
                    : "hover:bg-surface-subtle"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-border mt-auto border-t pt-3">
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
        {/* mobile top bar */}
        <header className="border-border bg-background sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <p className="font-semibold">Admin</p>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-full"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </form>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6 lg:pb-6">{children}</main>
      </div>

      {/* mobile bottom tab bar */}
      <nav className="border-border bg-background fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
