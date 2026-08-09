"use client";

import { useMemo, useState } from "react";

import { StatusControls } from "@/components/admin/status-controls";
import { BasicsTab } from "@/components/admin/tabs/basics-tab";
import { DescriptionTab } from "@/components/admin/tabs/description-tab";
import { PricingTab } from "@/components/admin/tabs/pricing-tab";
import { AddonsTab } from "@/components/admin/tabs/addons-tab";
import { PhotosTab } from "@/components/admin/tabs/photos-tab";
import { SectionsTab } from "@/components/admin/tabs/sections-tab";
import { LocationTab } from "@/components/admin/tabs/location-tab";
import { ChannelsTab } from "@/components/admin/tabs/channels-tab";
import { RoomServiceTab } from "@/components/admin/tabs/room-service-tab";
import { PrivateTab } from "@/components/admin/tabs/private-tab";
import { ContactsTab } from "@/components/admin/tabs/contacts-tab";
import { RulesTab } from "@/components/admin/tabs/rules-tab";
import type { PropertyForEdit } from "@/lib/admin/queries";
import type { AddonService, SiteSettings } from "@/lib/types/database";

const TABS = [
  "Basics",
  "Pricing",
  "Add-ons",
  "Description",
  "Photos",
  "Sections",
  "Location",
  "Booking options",
  "Room service",
  "Private info",
  "Contacts",
  "Rules",
] as const;

type Tab = (typeof TABS)[number];

export function PropertyEditor({
  property,
  addons,
  settings,
  siteUrl,
}: {
  property: PropertyForEdit;
  addons: (AddonService & { enabled: boolean })[];
  settings: SiteSettings;
  siteUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("Basics");

  // Memoized, not filtered inline at the PhotosTab call site: PhotosTab
  // resets its local drag-order state whenever the `images` array it
  // receives has a new identity, so an inline `.filter()` would reset that
  // ordering on every unrelated re-render of this component (a tab switch),
  // not just when the images actually change.
  const galleryImages = useMemo(
    () => property.property_images.filter((i) => i.in_gallery),
    [property.property_images],
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{property.title}</h1>
          <p className="text-text-muted text-sm">/properties/{property.slug}</p>
        </div>
      </div>

      <div className="mt-4">
        <StatusControls
          propertyId={property.id}
          slug={property.slug}
          siteUrl={siteUrl}
          title={property.title}
          status={property.status}
        />
      </div>

      <div className="border-border mt-6 overflow-x-auto border-b">
        <nav className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`pressable flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap ${
                tab === t
                  ? "border-primary text-primary"
                  : "text-text-muted hover:text-foreground border-transparent"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <div className="py-6">
        {tab === "Basics" ? <BasicsTab property={property} /> : null}
        {tab === "Pricing" ? <PricingTab property={property} /> : null}
        {tab === "Add-ons" ? (
          <AddonsTab propertyId={property.id} addons={addons} />
        ) : null}
        {tab === "Description" ? <DescriptionTab property={property} /> : null}
        {tab === "Photos" ? (
          <PhotosTab propertyId={property.id} images={galleryImages} />
        ) : null}
        {tab === "Sections" ? (
          <SectionsTab
            propertyId={property.id}
            sections={property.property_sections}
            propertyImages={property.property_images}
          />
        ) : null}
        {tab === "Location" ? <LocationTab property={property} /> : null}
        {tab === "Booking options" ? <ChannelsTab property={property} /> : null}
        {tab === "Room service" ? <RoomServiceTab property={property} /> : null}
        {tab === "Private info" ? (
          <PrivateTab propertyId={property.id} data={property.property_private} />
        ) : null}
        {tab === "Contacts" ? (
          <ContactsTab propertyId={property.id} contacts={property.property_contacts} />
        ) : null}
        {tab === "Rules" ? (
          <RulesTab property={property} settings={settings} />
        ) : null}
      </div>
    </div>
  );
}
