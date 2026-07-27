"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { Property } from "@/lib/types/database";

const PROPERTY_TYPES = ["Apartment", "Studio", "House", "Villa", "Room"];

export function BasicsTab({ property }: { property: Property }) {
  const { run, pending, error, saved } = useSaveAction(updateProperty);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(property.id, new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={property.title} required className="h-11" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input id="slug" name="slug" defaultValue={property.slug} required className="h-11" />
        <p className="text-text-muted text-sm">
          yoursite.com/properties/<span className="tabular">{property.slug}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="property_type">Property type</Label>
        <select
          id="property_type"
          name="property_type"
          defaultValue={property.property_type ?? "Apartment"}
          className="border-border h-11 w-full rounded-md border bg-transparent px-3"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="max_guests">Guests</Label>
          <Input
            id="max_guests"
            name="max_guests"
            type="number"
            min={1}
            defaultValue={property.max_guests}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            defaultValue={property.bedrooms}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="beds">Beds</Label>
          <Input
            id="beds"
            name="beds"
            type="number"
            min={0}
            defaultValue={property.beds}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bathrooms">Baths</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            step={0.5}
            defaultValue={property.bathrooms}
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={property.currency}
            className="h-11"
          />
          <p className="text-text-muted text-xs">
            Nightly rates live in the Pricing tab.
          </p>
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
