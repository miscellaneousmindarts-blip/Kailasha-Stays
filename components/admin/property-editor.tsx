"use client";

import { useState } from "react";

import { StatusControls } from "@/components/admin/status-controls";
import { BasicsTab } from "@/components/admin/tabs/basics-tab";
import { DescriptionTab } from "@/components/admin/tabs/description-tab";
import { PhotosTab } from "@/components/admin/tabs/photos-tab";
import { SectionsTab } from "@/components/admin/tabs/sections-tab";
import { LocationTab } from "@/components/admin/tabs/location-tab";
import { LinksTab } from "@/components/admin/tabs/links-tab";
import { PrivateTab } from "@/components/admin/tabs/private-tab";
import { ContactsTab } from "@/components/admin/tabs/contacts-tab";
import { RulesTab } from "@/components/admin/tabs/rules-tab";
import type { PropertyForEdit } from "@/lib/admin/queries";

const TABS = [
  "Basics",
  "Description",
  "Photos",
  "Sections",
  "Location",
  "Links",
  "Private info",
  "Contacts",
  "Rules",
] as const;

type Tab = (typeof TABS)[number];

export function PropertyEditor({ property }: { property: PropertyForEdit }) {
  const [tab, setTab] = useState<Tab>("Basics");

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
        {tab === "Description" ? <DescriptionTab property={property} /> : null}
        {tab === "Photos" ? (
          <PhotosTab propertyId={property.id} images={property.property_images} />
        ) : null}
        {tab === "Sections" ? (
          <SectionsTab
            propertyId={property.id}
            sections={property.property_sections}
            propertyImages={property.property_images}
          />
        ) : null}
        {tab === "Location" ? <LocationTab property={property} /> : null}
        {tab === "Links" ? <LinksTab property={property} /> : null}
        {tab === "Private info" ? (
          <PrivateTab propertyId={property.id} data={property.property_private} />
        ) : null}
        {tab === "Contacts" ? (
          <ContactsTab propertyId={property.id} contacts={property.property_contacts} />
        ) : null}
        {tab === "Rules" ? <RulesTab property={property} /> : null}
      </div>
    </div>
  );
}
