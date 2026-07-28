"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { Property, SiteSettings } from "@/lib/types/database";

function TimeField({
  id,
  label,
  value,
  onChange,
  siteDefault,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  siteDefault: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-primary text-xs underline-offset-2 hover:underline"
        >
          Use site default ({siteDefault})
        </button>
      ) : (
        <p className="text-text-muted text-xs">
          Using the site default: {siteDefault}
        </p>
      )}
    </div>
  );
}

export function RulesTab({
  property,
  settings,
}: {
  property: Property;
  settings: SiteSettings;
}) {
  const { run, pending, error, saved } = useSaveAction(updateProperty);
  const [checkInTime, setCheckInTime] = useState(property.check_in_time ?? "");
  const [checkOutTime, setCheckOutTime] = useState(property.check_out_time ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(property.id, new FormData(e.currentTarget));
      }}
      className="max-w-xl space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <TimeField
          id="check_in_time"
          label="Check-in from"
          value={checkInTime}
          onChange={setCheckInTime}
          siteDefault={settings.default_check_in_time}
        />
        <TimeField
          id="check_out_time"
          label="Check-out by"
          value={checkOutTime}
          onChange={setCheckOutTime}
          siteDefault={settings.default_check_out_time}
        />
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
