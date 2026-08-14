import Link from "next/link";
import { AlertTriangle, ArrowRight, ExternalLink, Inbox } from "lucide-react";

import { requireTenant } from "@/lib/admin/auth";
import {
  countNewEnquiries,
  listAllProperties,
  listSyncWarnings,
  listUpcomingStays,
} from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import { PLATFORM_SITE_URL } from "@/lib/platform-content";

const PLATFORM_LABEL: Record<string, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  other: "Other",
};

const SOURCE_STYLES: Record<string, string> = {
  direct: "bg-[#16a34a]/15 text-[#16a34a]",
  airbnb: "bg-[#e0484d]/15 text-[#e0484d]",
  booking_com: "bg-[#2563eb]/15 text-[#2563eb]",
  other: "bg-muted text-text-muted",
  blocked: "bg-muted text-text-muted",
};

export default async function AdminDashboardPage() {
  const [{ tenant }, properties, newEnquiries, upcomingStays, syncWarnings] = await Promise.all([
    requireTenant(),
    listAllProperties(),
    countNewEnquiries(),
    listUpcomingStays(7),
    listSyncWarnings(),
  ]);
  const published = properties.filter((p) => p.status === "published").length;
  const drafts = properties.filter((p) => p.status === "draft").length;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-text-muted mt-1">An overview of your listings and stays.</p>

      {tenant.plan === "listing" ? (
        <a
          href={PLATFORM_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border hover:bg-surface-subtle pressable mt-4 flex items-center justify-between gap-3 rounded-lg border p-4"
        >
          <span className="text-sm">
            <span className="font-medium">Your homes are listed on Deoghar BnB.</span>{" "}
            <span className="text-text-muted">
              No homepage of your own on this plan — guests find and book you there.
            </span>
          </span>
          <ExternalLink className="text-text-muted size-4 shrink-0" aria-hidden="true" />
        </a>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="border-border rounded-lg border p-4">
          <p className="text-text-muted text-sm">Properties</p>
          <p className="tabular mt-1 text-2xl font-semibold">{properties.length}</p>
        </div>
        <div className="border-border rounded-lg border p-4">
          <p className="text-text-muted text-sm">Published</p>
          <p className="tabular mt-1 text-2xl font-semibold">{published}</p>
        </div>
        <div className="border-border rounded-lg border p-4">
          <p className="text-text-muted text-sm">Drafts</p>
          <p className="tabular mt-1 text-2xl font-semibold">{drafts}</p>
        </div>
        <Link
          href="/admin/enquiries"
          className="border-border hover:bg-surface-subtle pressable rounded-lg border p-4"
        >
          <p className="text-text-muted text-sm">New enquiries</p>
          <p
            className={`tabular mt-1 text-2xl font-semibold ${newEnquiries > 0 ? "text-primary" : ""}`}
          >
            {newEnquiries}
          </p>
        </Link>
      </div>

      {syncWarnings.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Calendar sync warnings</h2>
          <ul className="border-danger/30 bg-danger/5 divide-danger/20 mt-3 divide-y rounded-lg border">
            {syncWarnings.map((w) => (
              <li key={w.id} className="flex items-start gap-3 p-3">
                <AlertTriangle
                  className="text-danger mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {w.properties?.title ?? "—"} · {PLATFORM_LABEL[w.platform] ?? w.platform}
                  </p>
                  <p className="text-text-muted text-sm">
                    {w.last_status === "error" && w.last_error
                      ? w.last_error
                      : w.last_synced_at
                        ? `Hasn't synced since ${formatDate(w.last_synced_at)}`
                        : "Never synced since it was added"}
                  </p>
                </div>
                <Link
                  href="/admin/settings"
                  className="text-primary shrink-0 self-center text-sm font-medium underline-offset-2 hover:underline"
                >
                  Fix
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Check-ins & check-outs, next 7 days</h2>
        {upcomingStays.length === 0 ? (
          <p className="text-text-muted mt-2 text-sm">Nothing coming up this week.</p>
        ) : (
          <ul className="border-border divide-border mt-3 divide-y rounded-lg border">
            {upcomingStays.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.guest_name ?? "Blocked"} · {s.properties?.title ?? "—"}
                  </p>
                  <p className="text-text-muted text-sm">
                    {formatDate(s.check_in)} – {formatDate(s.check_out)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SOURCE_STYLES[s.source]}`}
                >
                  {s.source.replace("_", ".")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/admin/listings"
        className="border-border hover:bg-surface-subtle pressable mt-8 flex h-12 items-center justify-between rounded-md border px-4 font-medium"
      >
        <span className="flex items-center gap-2">
          <Inbox className="size-4" aria-hidden="true" />
          Manage listings
        </span>
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
