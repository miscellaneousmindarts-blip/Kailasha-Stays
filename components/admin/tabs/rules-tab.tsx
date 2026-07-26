"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { Property } from "@/lib/types/database";

export function RulesTab({ property }: { property: Property }) {
  const { run, pending, error, saved } = useSaveAction(updateProperty);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(property.id, new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="check_in_time">Check-in from</Label>
          <Input
            id="check_in_time"
            name="check_in_time"
            type="time"
            defaultValue={property.check_in_time ?? "13:00"}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check_out_time">Check-out by</Label>
          <Input
            id="check_out_time"
            name="check_out_time"
            type="time"
            defaultValue={property.check_out_time ?? "11:00"}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="house_rules">House rules</Label>
        <Textarea
          id="house_rules"
          name="house_rules"
          rows={5}
          defaultValue={property.house_rules ?? ""}
          placeholder="e.g. No smoking indoors. Quiet hours after 10 pm."
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
