"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { Property } from "@/lib/types/database";

export function LocationTab({ property }: { property: Property }) {
  const { run, pending, error, saved } = useSaveAction(updateProperty);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(property.id, new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <p className="text-text-muted text-sm">
        This is the approximate location shown to everyone. The exact address
        lives in the Private info tab and is only ever shared with confirmed
        guests.
      </p>

      <div className="space-y-2">
        <Label htmlFor="address_line">Street / landmark</Label>
        <Input id="address_line" name="address_line" defaultValue={property.address_line ?? ""} className="h-11" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" name="area" defaultValue={property.area ?? ""} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={property.city ?? ""} className="h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input id="state" name="state" defaultValue={property.state ?? ""} className="h-11" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" name="lat" type="number" step="any" defaultValue={property.lat ?? ""} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" name="lng" type="number" step="any" defaultValue={property.lng ?? ""} className="h-11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gmaps_url">Google Maps link (approximate)</Label>
        <Input id="gmaps_url" name="gmaps_url" defaultValue={property.gmaps_url ?? ""} className="h-11" />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
