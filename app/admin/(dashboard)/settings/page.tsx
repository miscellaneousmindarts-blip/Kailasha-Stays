import type { Metadata } from "next";

import { SettingsTabs } from "@/components/admin/settings/settings-tabs";
import { getSiteSettingsAdmin } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettingsAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-text-muted mt-1 max-w-2xl text-sm">
        Your business details, the booking promises shown to guests, and default stay times.
      </p>

      <div className="mt-6">
        <SettingsTabs settings={settings} />
      </div>
    </div>
  );
}
