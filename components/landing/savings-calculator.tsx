"use client";

import { useState } from "react";
import { ArrowDown, Minus, Plus } from "lucide-react";

import { ShareButton } from "@/components/landing/actions";
import { money } from "@/lib/format";
import { track } from "@/lib/track";

/**
 * Steppers, not sliders — far easier on a phone for an older user, and they
 * give exact values rather than an approximate drag.
 */
function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const id = `stepper-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="border-border mt-2 flex items-center gap-1 rounded-md border p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-md disabled:opacity-30"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <output
          id={id}
          className="tabular flex-1 text-center text-lg font-semibold"
          aria-live="polite"
        >
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-md disabled:opacity-30"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Converts an asserted claim into a number the visitor generated themselves,
 * which is far more persuasive — and creates a natural share moment at the
 * exact instant they feel good about the value.
 */
export function SavingsCalculator({
  options,
  currency,
  shareSummary,
  hotelRoomRate,
}: {
  /** Every published home's rate and capacity. */
  options: { rate: number; sleeps: number }[];
  currency: string;
  shareSummary: string;
  /** Indicative local hotel room rate, from site_settings. */
  hotelRoomRate: number;
}) {
  const [guests, setGuests] = useState(6);
  const [nights, setNights] = useState(3);

  // Quote the cheapest home that can ACTUALLY sleep this many people. Using
  // the lowest rate on the page regardless of capacity would compare a
  // two-person studio against three hotel rooms and overstate the saving —
  // exactly the kind of arithmetic this page exists to be trusted over.
  const fitting = options
    .filter((o) => o.sleeps >= guests)
    .sort((a, b) => a.rate - b.rate)[0];

  function update(next: { guests?: number; nights?: number }) {
    const g = next.guests ?? guests;
    const n = next.nights ?? nights;
    setGuests(g);
    setNights(n);
    track("calculator_use", { guests: g, nights: n });
  }

  const ratePerNight = fitting?.rate ?? null;
  const ourTotal = ratePerNight !== null ? ratePerNight * nights : null;
  const rooms = Math.ceil(guests / 2);
  // Rooms only. There's no kitchen here, so a family eats out either way —
  // counting meals as a saving would be inventing one.
  const hotelTotal = hotelRoomRate * rooms * nights;
  const savings = ourTotal !== null ? hotelTotal - ourTotal : null;

  return (
    <div className="border-border bg-surface shadow-card mx-auto mt-10 max-w-[680px] rounded-lg border p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stepper
          label="Guests"
          value={guests}
          min={2}
          max={12}
          onChange={(v) => update({ guests: v })}
        />
        <Stepper
          label="Nights"
          value={nights}
          min={1}
          max={10}
          onChange={(v) => update({ nights: v })}
        />
      </div>

      <div className="border-border mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">One apartment, yours</p>
          {ratePerNight !== null && ourTotal !== null ? (
            <>
              <dl className="text-text-muted mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>
                    {money(ratePerNight, currency)} × {nights}{" "}
                    {nights === 1 ? "night" : "nights"}
                  </dt>
                  <dd className="tabular">{money(ourTotal, currency)}</dd>
                </div>
              </dl>
              <p className="tabular mt-3 text-lg font-semibold">
                {money(ourTotal, currency)}
              </p>
            </>
          ) : (
            <p className="text-text-muted mt-2 text-sm">
              No single home sleeps {guests}. Message us — we can often put your
              family in two flats in the same building, and we&apos;ll quote it
              in writing.
            </p>
          )}
        </div>

        <div className="sm:border-border sm:border-l sm:pl-4">
          <p className="text-sm font-semibold">A typical Deoghar hotel</p>
          <dl className="text-text-muted mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt>
                {rooms} {rooms === 1 ? "room" : "rooms"} × {nights}{" "}
                {nights === 1 ? "night" : "nights"}
              </dt>
              <dd className="tabular">{money(hotelTotal, currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{guests} people need</dt>
              <dd>{rooms} rooms at 2 per room</dd>
            </div>
          </dl>
          <p className="tabular text-text-muted mt-3 text-lg font-semibold">
            {money(hotelTotal, currency)}
          </p>
        </div>
      </div>

      {savings !== null && savings > 0 ? (
        <p className="bg-success/10 text-success mt-6 rounded-md px-4 py-3 text-center text-lg font-semibold">
          You save about{" "}
          <span className="tabular">{money(savings, currency)}</span> on this trip.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="#homes"
          onClick={() =>
            track("property_click", { property: "all", section: "calculator" })
          }
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-md px-5 font-medium"
        >
          See the homes
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
        <ShareButton location="calculator" summary={shareSummary} variant="button" />
      </div>

      <p className="text-text-muted mt-4 text-sm">
        Room rates only, on both sides — meals aren&apos;t counted either way.
        Hotel figures are indicative Deoghar market rates. Your actual quote is
        always confirmed in writing before you pay.
      </p>
    </div>
  );
}
