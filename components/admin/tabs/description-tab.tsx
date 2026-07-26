"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateProperty } from "@/app/admin/(dashboard)/listings/[id]/actions";
import { AMENITIES, AMENITY_KEYS } from "@/lib/amenities";
import type { Property } from "@/lib/types/database";

export function DescriptionTab({ property }: { property: Property }) {
  const { run, pending, error, saved } = useSaveAction(updateProperty);
  const [amenities, setAmenities] = useState<Set<string>>(
    new Set(property.amenities),
  );

  function toggle(key: string) {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.delete("amenities");
    for (const key of amenities) formData.append("amenities", key);
    run(property.id, formData);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={property.description ?? ""}
          rows={8}
          placeholder="What makes this place worth staying at? Separate paragraphs with a blank line."
        />
      </div>

      <div className="space-y-2">
        <p className="font-medium">Amenities</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {AMENITY_KEYS.map((key) => {
            const meta = AMENITIES[key];
            const Icon = meta.icon;
            return (
              <label
                key={key}
                className="hover:bg-surface-subtle flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2"
              >
                <Checkbox
                  checked={amenities.has(key)}
                  onCheckedChange={() => toggle(key)}
                />
                <Icon className="text-text-muted size-4 shrink-0" aria-hidden="true" />
                <span className="text-sm">{meta.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
