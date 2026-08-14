"use client";

import { useState } from "react";

import { SectionTabs } from "@/components/admin/section-tabs";
import { ContactSettingsForm } from "@/components/admin/settings/contact-settings-form";
import { BookingPolicyForm } from "@/components/admin/settings/booking-policy-form";
import { StayDefaultsForm } from "@/components/admin/settings/stay-defaults-form";
import { BrandSettingsForm } from "@/components/admin/settings/brand-settings-form";
import type { SiteSettings, TenantPlan } from "@/lib/types/database";

const ALL_TABS = ["Business details", "Brand", "Booking policy", "Stay defaults"] as const;
type Tab = (typeof ALL_TABS)[number];

/**
 * Settings used to be five unrelated sections stacked into five screens of
 * scrolling with six separate save buttons. It's now three tabs of genuinely
 * related fields, matching the tabbed pattern the property editor already
 * used — Settings had been the only long-scroll page in the admin.
 *
 * The two sections that left entirely: calendar sync moved under Calendar
 * (it's calendar configuration), and the add-on catalogue became its own
 * destination (it's inventory, not a preference).
 */
export function SettingsTabs({
  settings,
  plan,
}: {
  settings: SiteSettings;
  /** A 'listing' tenant has no logo/favicon/accent colour of their own to
   *  set — their apex property page never reads them (0027,
   *  docs/tenant-plans-plan.md §5) — so the Brand tab is dropped entirely
   *  rather than shown with nothing it does. */
  plan: TenantPlan;
}) {
  const tabs = plan === "listing" ? ALL_TABS.filter((t) => t !== "Brand") : ALL_TABS;
  const [tab, setTab] = useState<Tab>("Business details");

  return (
    <div>
      <SectionTabs tabs={tabs} active={tab} onChange={setTab} label="Settings sections" />

      <div className="py-6">
        {tab === "Business details" ? (
          <>
            <p className="text-text-muted mb-5 max-w-xl text-sm">
              Who you are and how guests reach you — used across the homepage, every property page
              and the guest portal.
            </p>
            <ContactSettingsForm settings={settings} />
          </>
        ) : null}

        {tab === "Brand" ? (
          <>
            <p className="text-text-muted mb-5 max-w-xl text-sm">
              Your logo, favicon and accent color — what makes the site look
              like yours instead of a template.
            </p>
            <BrandSettingsForm settings={settings} />
          </>
        ) : null}

        {tab === "Booking policy" ? (
          <>
            <p className="text-text-muted mb-5 max-w-xl text-sm">
              The promises quoted back to guests. Each appears in more than one place on the site, so
              setting it here keeps every mention in agreement.
            </p>
            <BookingPolicyForm settings={settings} />
          </>
        ) : null}

        {tab === "Stay defaults" ? (
          <>
            <p className="text-text-muted mb-5 max-w-xl text-sm">
              Used for any property that hasn&apos;t set its own check-in / check-out time — override
              per listing in that property&apos;s Rules tab.
            </p>
            <StayDefaultsForm settings={settings} />
          </>
        ) : null}
      </div>
    </div>
  );
}
