"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateStayDefaults } from "@/app/admin/(dashboard)/settings/actions";
import type { SiteSettings } from "@/lib/types/database";

export function StayDefaultsForm({ settings }: { settings: SiteSettings }) {
  const action = useSaveAction(updateStayDefaults);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.run(new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <p className="text-text-muted text-sm">
        Used for any property that hasn&apos;t set its own check-in/check-out
        time — override per listing in that property&apos;s Rules tab.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="default_check_in_time">Check-in from</Label>
          <Input
            id="default_check_in_time"
            name="default_check_in_time"
            type="time"
            defaultValue={settings.default_check_in_time}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_check_out_time">Check-out by</Label>
          <Input
            id="default_check_out_time"
            name="default_check_out_time"
            type="time"
            defaultValue={settings.default_check_out_time}
            required
            className="h-11"
          />
        </div>
      </div>

      <SaveBar pending={action.pending} saved={action.saved} error={action.error} />
    </form>
  );
}
