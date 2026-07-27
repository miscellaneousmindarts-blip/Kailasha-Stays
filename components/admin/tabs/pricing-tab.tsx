"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addRatePeriod,
  deleteRatePeriod,
  updateProperty,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import { formatDate, money } from "@/lib/format";
import type { PropertyForEdit } from "@/lib/admin/queries";
import type { RatePeriod } from "@/lib/types/database";

export function PricingTab({ property }: { property: PropertyForEdit }) {
  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Default nightly rates</h2>
        <p className="text-text-muted mt-1 text-sm">
          Used for any night not covered by a price period below.
        </p>
        <DefaultRatesForm property={property} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Price periods</h2>
        <p className="text-text-muted mt-1 text-sm">
          Charge different rates for specific dates — weekends, festivals, off
          season. Periods can&apos;t overlap.
        </p>
        <RatePeriodList
          propertyId={property.id}
          periods={property.rate_periods}
          currency={property.currency}
        />
      </section>
    </div>
  );
}

function DefaultRatesForm({ property }: { property: PropertyForEdit }) {
  const { run, pending, error, saved } = useSaveAction(updateProperty);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(property.id, new FormData(e.currentTarget));
      }}
      className="mt-4 space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base_price">Direct price per night</Label>
          <Input
            id="base_price"
            name="base_price"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={property.base_price ?? ""}
            className="h-11"
          />
          <p className="text-text-muted text-xs">
            What a guest pays booking through this site.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="airbnb_base_price">Airbnb price per night</Label>
          <Input
            id="airbnb_base_price"
            name="airbnb_base_price"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={property.airbnb_base_price ?? ""}
            className="h-11"
          />
          <p className="text-text-muted text-xs">
            The same stay&apos;s Airbnb cost, so guests see the saving. Leave
            blank to hide the comparison.
          </p>
        </div>
      </div>

      <SaveBar pending={pending} error={error} saved={saved} />
    </form>
  );
}

function RatePeriodList({
  propertyId,
  periods,
  currency,
}: {
  propertyId: string;
  periods: RatePeriod[];
  currency: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      {periods.length ? (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {periods.map((p) => (
            <RatePeriodRow
              key={p.id}
              propertyId={propertyId}
              period={p}
              currency={currency}
            />
          ))}
        </ul>
      ) : (
        <p className="text-text-muted border-border rounded-lg border border-dashed p-4 text-sm">
          No price periods yet — every night uses the defaults above.
        </p>
      )}

      <AddRatePeriodForm propertyId={propertyId} />
    </div>
  );
}

function RatePeriodRow({
  propertyId,
  period,
  currency,
}: {
  propertyId: string;
  period: RatePeriod;
  currency: string;
}) {
  const del = useSaveAction(deleteRatePeriod);

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {period.label ? `${period.label} · ` : ""}
          {formatDate(period.start_date)} – {formatDate(period.end_date)}
        </p>
        <p className="text-text-muted mt-0.5 text-sm">
          Direct{" "}
          <span className="tabular">{money(period.direct_price, currency)}</span>
          {period.airbnb_price !== null ? (
            <>
              {" · Airbnb "}
              <span className="tabular">
                {money(period.airbnb_price, currency)}
              </span>
            </>
          ) : (
            " · Airbnb uses the default"
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => del.run(propertyId, period.id)}
        disabled={del.pending}
        aria-label={`Delete price period starting ${formatDate(period.start_date)}`}
        className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-full disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      {del.error ? (
        <p role="alert" className="text-danger w-full text-sm">
          {del.error}
        </p>
      ) : null}
    </li>
  );
}

function AddRatePeriodForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const add = useSaveAction(addRatePeriod);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-surface-subtle pressable flex h-10 items-center rounded-md border border-dashed px-3 text-sm font-medium"
      >
        + Add price period
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const ok = await add.runAndWait(propertyId, new FormData(form));
        if (ok) {
          form.reset();
          setOpen(false);
        }
      }}
      className="border-border space-y-4 rounded-lg border p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="label">Name (optional)</Label>
        <Input
          id="label"
          name="label"
          placeholder="Diwali week"
          className="h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">First night</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Checkout day</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            required
            className="h-11"
          />
          <p className="text-text-muted text-xs">
            Not charged — the morning guests leave.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="direct_price">Direct price / night</Label>
          <Input
            id="direct_price"
            name="direct_price"
            type="number"
            min={0}
            inputMode="numeric"
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="airbnb_price">Airbnb price / night</Label>
          <Input
            id="airbnb_price"
            name="airbnb_price"
            type="number"
            min={0}
            inputMode="numeric"
            className="h-11"
          />
          <p className="text-text-muted text-xs">
            Blank falls back to the default.
          </p>
        </div>
      </div>

      {add.error ? (
        <p role="alert" className="text-danger text-sm">
          {add.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={add.pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-10 items-center rounded-md px-4 text-sm font-medium disabled:opacity-60"
        >
          Add period
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="hover:bg-surface-subtle pressable flex h-10 items-center rounded-md px-4 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
