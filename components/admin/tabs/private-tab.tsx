"use client";

import { Lock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updatePropertyPrivate } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { PropertyPrivate } from "@/lib/types/database";

export function PrivateTab({
  propertyId,
  data,
}: {
  propertyId: string;
  data: PropertyPrivate | null;
}) {
  const { run, pending, error, saved } = useSaveAction(updatePropertyPrivate);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(propertyId, new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <p className="text-text-muted flex items-start gap-2 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Never shown publicly — only in the guest portal after a booking is
        confirmed, and here in admin.
      </p>

      <div className="space-y-2">
        <Label htmlFor="exact_address">Exact address</Label>
        <Textarea
          id="exact_address"
          name="exact_address"
          rows={2}
          defaultValue={data?.exact_address ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exact_gmaps_url">Exact Google Maps link</Label>
        <Input
          id="exact_gmaps_url"
          name="exact_gmaps_url"
          defaultValue={data?.exact_gmaps_url ?? ""}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="directions_note">Directions</Label>
        <Textarea
          id="directions_note"
          name="directions_note"
          rows={3}
          placeholder="e.g. Enter Lane 4 opposite Kesi Ghat parking, third floor."
          defaultValue={data?.directions_note ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wifi_name">Wifi name</Label>
          <Input id="wifi_name" name="wifi_name" defaultValue={data?.wifi_name ?? ""} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wifi_password">Wifi password</Label>
          <Input
            id="wifi_password"
            name="wifi_password"
            defaultValue={data?.wifi_password ?? ""}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="door_code">Door code</Label>
        <Input id="door_code" name="door_code" defaultValue={data?.door_code ?? ""} className="h-11" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="other_notes">Other notes for guests</Label>
        <Textarea
          id="other_notes"
          name="other_notes"
          rows={3}
          defaultValue={data?.other_notes ?? ""}
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
