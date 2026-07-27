import { ContactSettingsForm } from "@/components/admin/settings/contact-settings-form";
import { CalendarSourcesPanel } from "@/components/admin/settings/calendar-sources-panel";
import {
  getSiteSettingsAdmin,
  listAllCalendarSources,
  listPropertyOptions,
} from "@/lib/admin/queries";
import { publicEnv, serverEnv } from "@/lib/env";

export default async function AdminSettingsPage() {
  const [settings, properties, sources] = await Promise.all([
    getSiteSettingsAdmin(),
    listPropertyOptions(),
    listAllCalendarSources(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-text-muted mt-1">
          Contact details shown across the site, and calendar sync with
          Airbnb / Booking.com.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Contact details</h2>
        <ContactSettingsForm settings={settings} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Calendar sync</h2>
        {properties.length === 0 ? (
          <p className="text-text-muted text-sm">
            Create a property first, then its calendar sync options appear
            here.
          </p>
        ) : (
          <CalendarSourcesPanel
            properties={properties}
            sources={sources}
            exportBaseUrl={`${publicEnv.siteUrl}/api/ical`}
            exportKey={serverEnv.icalExportSecret}
          />
        )}
      </section>
    </div>
  );
}
