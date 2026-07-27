"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { useSaveAction } from "@/components/admin/use-save-action";
import { setPropertyAddonEnabled } from "@/app/admin/(dashboard)/listings/[id]/actions";
import { money } from "@/lib/format";
import type { AddonService } from "@/lib/types/database";

function AddonToggleRow({
  propertyId,
  addon,
}: {
  propertyId: string;
  addon: AddonService & { enabled: boolean };
}) {
  const toggle = useSaveAction(setPropertyAddonEnabled);

  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 p-3 ${
        toggle.pending ? "opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={addon.enabled}
        disabled={toggle.pending}
        onCheckedChange={(checked) =>
          toggle.run(propertyId, addon.id, checked === true)
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {addon.name}
          {!addon.active ? (
            <span className="text-text-muted font-normal"> · inactive in catalog</span>
          ) : null}
        </p>
        {addon.price !== null ? (
          <p className="text-text-muted text-sm">
            {money(addon.price, "INR")} {addon.price_unit}
          </p>
        ) : null}
      </div>
      {toggle.pending ? (
        <Loader2 className="text-text-muted size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : null}
      {toggle.error ? (
        <span role="alert" className="text-danger shrink-0 text-xs">
          {toggle.error}
        </span>
      ) : null}
    </label>
  );
}

export function AddonsTab({
  propertyId,
  addons,
}: {
  propertyId: string;
  addons: (AddonService & { enabled: boolean })[];
}) {
  if (!addons.length) {
    return (
      <div className="max-w-2xl">
        <p className="text-text-muted border-border rounded-md border border-dashed p-4 text-sm">
          The add-on catalog is empty.{" "}
          <Link
            href="/admin/settings"
            className="text-primary underline-offset-2 hover:underline"
          >
            Add some in Settings
          </Link>
          , then come back here to switch them on for this property.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-text-muted text-sm">
        Which services from the shared catalog guests can request for this
        property. Manage names, prices and descriptions in{" "}
        <Link
          href="/admin/settings"
          className="text-primary underline-offset-2 hover:underline"
        >
          Settings
        </Link>
        .
      </p>

      <div className="border-border divide-border divide-y rounded-md border">
        {addons.map((a) => (
          <AddonToggleRow key={a.id} propertyId={propertyId} addon={a} />
        ))}
      </div>
    </div>
  );
}
