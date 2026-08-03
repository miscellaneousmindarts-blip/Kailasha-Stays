import type { Metadata } from "next";

import { CalendarTabs } from "@/components/admin/calendar/calendar-tabs";
import { listAllCalendarSources, listPropertyOptions } from "@/lib/admin/queries";
import { publicEnv, serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Calendar" };

export default async function AdminCalendarPage() {
  const [properties, sources] = await Promise.all([
    listPropertyOptions(),
    listAllCalendarSources(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="text-text-muted mt-1 max-w-2xl text-sm">
        Every source in one place — direct bookings, manual blocks, and
        synced Airbnb / Booking.com dates.
      </p>

      {properties.length === 0 ? (
        <div className="border-border mt-8 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No properties yet</p>
          <p className="text-text-muted mt-1 text-sm">
            Create a listing first, then its calendar appears here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <CalendarTabs
            properties={properties}
            sources={sources}
            exportBaseUrl={`${publicEnv.siteUrl}/api/ical`}
            exportKey={serverEnv.icalExportSecret}
          />
        </div>
      )}
    </div>
  );
}
