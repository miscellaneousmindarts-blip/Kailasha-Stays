import { ContactSettingsForm } from "@/components/admin/settings/contact-settings-form";
import { CalendarSourcesPanel } from "@/components/admin/settings/calendar-sources-panel";
import { AddonCatalogPanel } from "@/components/admin/settings/addon-catalog-panel";
import {
  getSiteSettingsAdmin,
  listAllAddonServices,
  listAllCalendarSources,
  listPropertyOptions,
} from "@/lib/admin/queries";
import { publicEnv, serverEnv } from "@/lib/env";

export default async function AdminSettingsPage() {
  const [settings, properties, sources, addons] = await Promise.all([
    getSiteSettingsAdmin(),
    listPropertyOptions(),
    listAllCalendarSources(),
    listAllAddonServices(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-text-muted mt-1">
          Contact details shown across the site, calendar sync with Airbnb /
          Booking.com, and the add-on catalog.
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

      <section>
        <h2 className="mb-4 text-lg font-semibold">Add-ons</h2>
        <AddonCatalogPanel addons={addons} />
      </section>
    </div>
  );
}
