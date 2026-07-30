"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateHostAndPromises } from "@/app/admin/(dashboard)/settings/actions";
import type { SiteSettings } from "@/lib/types/database";

/** Reconstructs an "HH:MM" default from the stored hour. Reply hours are
 *  assumed to land on the hour in practice ("8am", "9pm") — if you've set a
 *  half-hour start, re-enter it after loading this form. */
function hourToTime(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * These facts are quoted across several homepage sections at once — the
 * trust ribbon, the hero, the FAQ, the Shravan strip — via {tokens}, so
 * changing a number here updates every place it's mentioned instead of
 * requiring the same edit in five different sections.
 */
export function HostAndPromisesForm({ settings }: { settings: SiteSettings }) {
  const action = useSaveAction(updateHostAndPromises);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.run(new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-6"
    >
      <div className="space-y-4">
        <p className="text-text-muted text-sm">
          Setting your name is what makes the &quot;Meet your host&quot; section
          appear on the homepage — it stays hidden until you do.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="host_name">Your name</Label>
            <Input
              id="host_name"
              name="host_name"
              defaultValue={settings.host_name ?? ""}
              placeholder="Kamal Kishan"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host_years">Years in Deoghar</Label>
            <Input
              id="host_years"
              name="host_years"
              defaultValue={settings.host_years ?? ""}
              placeholder="40"
              className="h-11"
            />
          </div>
        </div>
      </div>

      <div className="border-border grid gap-4 border-t pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reply_minutes">Typical reply time (minutes)</Label>
          <Input
            id="reply_minutes"
            name="reply_minutes"
            type="number"
            min={1}
            max={1440}
            defaultValue={settings.reply_minutes}
            required
            className="h-11"
          />
        </div>
        <div />
        <div className="space-y-2">
          <Label htmlFor="hours_start_24">Replies from</Label>
          <Input
            id="hours_start_24"
            name="hours_start_24"
            type="time"
            defaultValue={hourToTime(settings.hours_start_hour)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hours_end_24">Replies until</Label>
          <Input
            id="hours_end_24"
            name="hours_end_24"
            type="time"
            defaultValue={hourToTime(settings.hours_end_hour)}
            required
            className="h-11"
          />
        </div>
      </div>
      <p className="text-text-muted -mt-4 text-xs">
        Drives the sticky bar&apos;s &quot;Open · replies in ~{settings.reply_minutes} min&quot;
        pip — it switches to &quot;We reply by…&quot; outside these hours, so keep them true.
      </p>

      <div className="border-border grid gap-4 border-t pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cancel_days">Free cancellation window (days)</Label>
          <Input
            id="cancel_days"
            name="cancel_days"
            type="number"
            min={0}
            max={90}
            defaultValue={settings.cancel_days}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="advance_pct">Advance to hold a booking (%)</Label>
          <Input
            id="advance_pct"
            name="advance_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={settings.advance_pct}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="hotel_room_rate">Typical local hotel room rate (₹/night)</Label>
          <Input
            id="hotel_room_rate"
            name="hotel_room_rate"
            type="number"
            min={0}
            defaultValue={settings.hotel_room_rate}
            required
            className="h-11"
          />
          <p className="text-text-muted text-xs">
            Feeds the &quot;why an apartment beats three hotel rooms&quot; savings
            calculator — an indicative market rate, not any specific hotel&apos;s.
          </p>
        </div>
      </div>

      <div className="border-border grid gap-4 border-t pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maps_url">Google Maps link</Label>
          <Input
            id="maps_url"
            name="maps_url"
            type="url"
            defaultValue={settings.maps_url ?? ""}
            placeholder="https://maps.app.goo.gl/…"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram_url">Instagram</Label>
          <Input
            id="instagram_url"
            name="instagram_url"
            type="url"
            defaultValue={settings.instagram_url ?? ""}
            className="h-11"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="facebook_url">Facebook</Label>
          <Input
            id="facebook_url"
            name="facebook_url"
            type="url"
            defaultValue={settings.facebook_url ?? ""}
            className="h-11"
          />
        </div>
      </div>

      <SaveBar pending={action.pending} saved={action.saved} error={action.error} />
    </form>
  );
}
