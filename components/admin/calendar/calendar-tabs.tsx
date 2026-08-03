"use client";

import { useState } from "react";

import { SectionTabs } from "@/components/admin/section-tabs";
import { AdminCalendar } from "@/components/admin/calendar/admin-calendar";
import { CalendarSourcesPanel } from "@/components/admin/settings/calendar-sources-panel";
import type { PropertyOption } from "@/lib/admin/queries";
import type { CalendarSource } from "@/lib/types/database";

const TABS = ["Availability", "Platform sync"] as const;
type Tab = (typeof TABS)[number];

/**
 * Calendar sync moved here from Settings. It's configuration for this
 * screen's data — the Airbnb and Booking.com blocks the grid renders come
 * from these feeds — so when a synced date looks wrong, the place to check is
 * now one tab away instead of on an unrelated page.
 */
export function CalendarTabs({
  properties,
  sources,
  exportBaseUrl,
  exportKey,
}: {
  properties: PropertyOption[];
  sources: CalendarSource[];
  exportBaseUrl: string;
  exportKey: string;
}) {
  const [tab, setTab] = useState<Tab>("Availability");

  return (
    <div>
      <SectionTabs tabs={TABS} active={tab} onChange={setTab} label="Calendar sections" />

      <div className="py-6">
        {tab === "Availability" ? <AdminCalendar properties={properties} /> : null}

        {tab === "Platform sync" ? (
          <>
            <p className="text-text-muted mb-5 max-w-2xl text-sm">
              Two-way sync with Airbnb and Booking.com. Import their calendar so their bookings block
              your dates here, and give them your export URL so a direct booking blocks you there.
            </p>
            <CalendarSourcesPanel
              properties={properties}
              sources={sources}
              exportBaseUrl={exportBaseUrl}
              exportKey={exportKey}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
