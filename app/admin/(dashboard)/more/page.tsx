import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";

import { signOut } from "@/app/admin/(dashboard)/actions";
import { MORE_GROUPS } from "@/lib/admin/nav";

export const metadata: Metadata = { title: "More" };

/**
 * The mobile home for everything that isn't daily operations.
 *
 * Exists because the tab bar is capped at five and those five are spent on
 * work the owner does every day. Previously Homepage and Settings hung off
 * two unlabelled icons in the mobile header — findable only if you already
 * knew they were there. Full-width labelled rows with a line of explanation
 * are the fix.
 *
 * Desktop doesn't link here — the sidebar already lists every destination —
 * but the page still renders at any width rather than hiding itself, so a
 * bookmarked or shared /admin/more never resolves to a blank screen.
 */
export default function MorePage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">More</h1>
        <p className="text-text-muted mt-1 text-sm">
          Your website content and business setup.
        </p>
      </div>

      {MORE_GROUPS.map((group) => (
        <section key={group.label}>
          <h2 className="text-text-muted mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
            {group.label}
          </h2>
          <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:bg-surface-subtle pressable flex min-h-16 items-center gap-3 p-4"
                >
                  <Icon className="text-text-muted size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.label}</span>
                    {item.hint ? (
                      <span className="text-text-muted block text-sm">{item.hint}</span>
                    ) : null}
                  </span>
                  <ChevronRight className="text-text-muted size-4 shrink-0" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <form action={signOut}>
        <button
          type="submit"
          className="border-border hover:bg-surface-subtle pressable flex min-h-14 w-full items-center gap-3 rounded-lg border p-4 font-medium"
        >
          <LogOut className="text-text-muted size-5 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  );
}
