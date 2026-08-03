"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateBookingPolicy } from "@/app/admin/(dashboard)/settings/actions";
import type { SiteSettings } from "@/lib/types/database";

/** Reconstructs an "HH:MM" default from the stored hour. Reply hours are
 *  assumed to land on the hour in practice ("8am", "9pm") — if you've set a
 *  half-hour start, re-enter it after loading this form. */
function hourToTime(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * The promises quoted back to guests. Each of these appears in more than one
 * place on the site, which is exactly why they're set once here rather than
 * inside whichever section happens to display them.
 */
export function BookingPolicyForm({ settings }: { settings: SiteSettings }) {
  const action = useSaveAction(updateBookingPolicy);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.run(new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cancel_days">Free cancellation window (days)</Label>
          <Input
            id="cancel_days"
            name="cancel_days"
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            defaultValue={settings.cancel_days}
            required
            className="h-11"
          />
          <p className="text-text-muted text-xs">Shown in the trust ribbon and the FAQ.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="advance_pct">Advance to hold a booking (%)</Label>
          <Input
            id="advance_pct"
            name="advance_pct"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            defaultValue={settings.advance_pct}
            required
            className="h-11"
          />
          <p className="text-text-muted text-xs">Shown in the Shravan notice and the FAQ.</p>
        </div>
      </div>

      <div className="border-border space-y-4 border-t pt-5">
        <div className="max-w-[240px] space-y-2">
          <Label htmlFor="reply_minutes">Typical reply time (minutes)</Label>
          <Input
            id="reply_minutes"
            name="reply_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            defaultValue={settings.reply_minutes}
            required
            className="h-11"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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

        <p className="text-text-muted text-xs">
          Drives the sticky bar&apos;s &quot;Open · replies in ~{settings.reply_minutes} min&quot; pip
          — it switches to &quot;We reply by…&quot; outside these hours, so keep them true.
        </p>
      </div>

      <SaveBar pending={action.pending} saved={action.saved} error={action.error} />
    </form>
  );
}
