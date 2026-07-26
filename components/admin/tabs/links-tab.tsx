"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { Property } from "@/lib/types/database";

export function LinksTab({ property }: { property: Property }) {
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
        <Label htmlFor="airbnb_url">Airbnb listing URL</Label>
        <Input
          id="airbnb_url"
          name="airbnb_url"
          type="url"
          placeholder="https://www.airbnb.co.in/rooms/..."
          defaultValue={property.airbnb_url ?? ""}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking_com_url">Booking.com listing URL</Label>
        <Input
          id="booking_com_url"
          name="booking_com_url"
          type="url"
          placeholder="https://www.booking.com/hotel/..."
          defaultValue={property.booking_com_url ?? ""}
          className="h-11"
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
