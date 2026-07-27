"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import type { BookingRow } from "@/lib/admin/queries";
import type { PropertyOption } from "@/lib/admin/queries";

const SOURCE_STYLES: Record<string, string> = {
  direct: "bg-[#16a34a]/15 text-[#16a34a]",
  airbnb: "bg-[#e0484d]/15 text-[#e0484d]",
  booking_com: "bg-[#2563eb]/15 text-[#2563eb]",
  other: "bg-muted text-text-muted",
  blocked: "bg-muted text-text-muted",
};

type WhenFilter = "upcoming" | "past" | "all";

export function BookingsList({
  bookings,
  properties,
}: {
  bookings: BookingRow[];
  properties: PropertyOption[];
}) {
  const [when, setWhen] = useState<WhenFilter>("upcoming");
  const [propertyId, setPropertyId] = useState<string>("all");

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (propertyId !== "all" && b.property_id !== propertyId) return false;
      if (when === "upcoming" && b.check_out < today) return false;
      if (when === "past" && b.check_out >= today) return false;
      return true;
    });
  }, [bookings, propertyId, when, today]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(["upcoming", "past", "all"] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWhen(w)}
            className={`pressable flex h-9 items-center rounded-full border px-3 text-sm font-medium capitalize ${
              when === w
                ? "border-primary bg-primary-tint text-primary"
                : "border-border hover:bg-surface-subtle"
            }`}
          >
            {w}
          </button>
        ))}
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="border-border ml-auto h-9 rounded-full border px-3 text-sm"
        >
          <option value="all">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="border-border mt-6 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No bookings here</p>
          <p className="text-text-muted mt-1 text-sm">
            Converted enquiries and manual blocks will show up here.
          </p>
        </div>
      ) : (
        <ul className="border-border divide-border mt-4 divide-y rounded-lg border">
          {filtered.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/bookings/${b.id}`}
                className="hover:bg-surface-subtle pressable flex items-center gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {b.guest_name ?? (b.source === "blocked" ? "Blocked" : "Guest")}
                  </p>
                  <p className="text-text-muted truncate text-sm">
                    {b.properties?.title ?? "—"} · {formatDate(b.check_in)} –{" "}
                    {formatDate(b.check_out)}
                  </p>
                </div>
                {b.status === "cancelled" ? (
                  <span className="bg-danger/15 text-danger shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
                    Cancelled
                  </span>
                ) : null}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SOURCE_STYLES[b.source]}`}
                >
                  {b.source.replace("_", ".")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
