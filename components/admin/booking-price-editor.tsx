"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, money } from "@/lib/format";
import { bookingTotal } from "@/lib/pricing";
import type { BookingCharge, BookingChargeKind, NightlyRateEntry } from "@/lib/types/database";

let chargeIdSeq = 0;
function newChargeId(): string {
  chargeIdSeq += 1;
  return `new-${Date.now()}-${chargeIdSeq}`;
}

/**
 * The one place a booking's total gets built: an editable rate per night,
 * plus any number of free-form charges or discounts. Every consumer — new
 * booking, converting an enquiry or a calendar block, editing an existing
 * booking — embeds this and reads its two hidden inputs on submit, so the
 * total can never be typed in disagreeing with the breakdown behind it:
 * there is no longer a separate total field to disagree with.
 *
 * Submits as two hidden JSON inputs, `nightly_rates` and `charges`, matching
 * bookings.nightly_rates / bookings.charges exactly — the server action
 * parses the same shape and computes the same total from it via
 * lib/pricing.ts's bookingTotal(), so the number shown here while editing
 * and the number that lands in the database can never disagree either.
 */
export function BookingPriceEditor({
  checkIn,
  checkOut,
  currency,
  suggestedNightly,
  initialNightlyRates,
  initialCharges,
}: {
  /** yyyy-MM-dd. Regenerating the night rows when these change is the point
   *  — a stale row for a date outside the new range makes no sense to keep. */
  checkIn: string;
  checkOut: string;
  currency: string;
  /** Per-night suggested rate, keyed by date — from the property's current
   *  rates (quoteStay's nightly breakdown). Null entries seed as 0. */
  suggestedNightly: { date: string; direct: number | null }[];
  /** The booking's own stored rates, when editing one that's already
   *  itemised. Takes priority over the suggestion on first mount only. */
  initialNightlyRates?: NightlyRateEntry[] | null;
  initialCharges?: BookingCharge[];
}) {
  const suggestedByDate = new Map(suggestedNightly.map((n) => [n.date, n.direct]));

  function ratesForRange(): NightlyRateEntry[] {
    // The stored rates only apply if they cover exactly this date range —
    // otherwise they're left over from before the dates changed and have
    // nothing meaningful to say about the current one.
    if (
      initialNightlyRates?.length === suggestedNightly.length &&
      initialNightlyRates.every((r, i) => r.date === suggestedNightly[i]?.date)
    ) {
      return initialNightlyRates;
    }
    return suggestedNightly.map((n) => ({ date: n.date, rate: n.direct ?? 0 }));
  }

  const [nightlyRates, setNightlyRates] = useState<NightlyRateEntry[]>(ratesForRange);
  const [charges, setCharges] = useState<BookingCharge[]>(initialCharges ?? []);

  // Regenerate the night rows when the date range itself changes — but not
  // on the initial mount, which already seeded correctly above, and not
  // when only e.g. guests changes elsewhere in the parent form. Charges are
  // untouched by a date change: a cleaning fee doesn't stop being one.
  const rangeKey = `${checkIn}_${checkOut}`;
  const lastRangeKey = useRef(rangeKey);
  useEffect(() => {
    if (rangeKey === lastRangeKey.current) return;
    lastRangeKey.current = rangeKey;
    setNightlyRates(suggestedNightly.map((n) => ({ date: n.date, rate: n.direct ?? 0 })));
    // suggestedNightly is derived from checkIn/checkOut in every caller, so
    // reacting to the range key alone (not the array identity) is correct
    // and avoids re-running on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  function setRate(date: string, rate: number) {
    setNightlyRates((prev) => prev.map((n) => (n.date === date ? { ...n, rate } : n)));
  }

  function addCharge(kind: BookingChargeKind) {
    setCharges((prev) => [
      ...prev,
      { id: newChargeId(), label: "", kind, amount: 0 },
    ]);
  }

  function updateCharge(id: string, patch: Partial<BookingCharge>) {
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCharge(id: string) {
    setCharges((prev) => prev.filter((c) => c.id !== id));
  }

  const total = bookingTotal(nightlyRates, charges);

  return (
    <div className="space-y-4">
      <input type="hidden" name="nightly_rates" value={JSON.stringify(nightlyRates)} />
      <input type="hidden" name="charges" value={JSON.stringify(charges)} />

      <div>
        <p className="text-sm font-medium">Nightly rate</p>
        <ul className="border-border divide-border mt-2 divide-y rounded-md border">
          {nightlyRates.map((n) => {
            const suggested = suggestedByDate.get(n.date);
            const isCustom = suggested !== undefined && suggested !== null && n.rate !== suggested;
            return (
              <li key={n.date} className="flex items-center gap-3 p-2.5">
                <span className="text-text-muted min-w-0 flex-1 truncate text-sm">
                  {formatDate(n.date)}
                  {isCustom ? (
                    <span className="ml-1.5">
                      · <span className="line-through">{money(suggested as number, currency)}</span>
                    </span>
                  ) : null}
                </span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={n.rate}
                  onChange={(e) => setRate(n.date, Number(e.target.value) || 0)}
                  aria-label={`Rate for ${formatDate(n.date)}`}
                  className="h-9 w-28 shrink-0 text-right"
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Additional charges & discounts</p>
        </div>

        {charges.length ? (
          <ul className="mt-2 space-y-2">
            {charges.map((c) => (
              // Two rows always, not just below a breakpoint: a label input
              // squeezed onto one row alongside the amount and remove
              // button has no room left for a normal-length label like
              // "Early-bird discount" even on a desktop-width form — this
              // was found by actually typing one in, not assumed.
              <li key={c.id} className="border-border rounded-md border p-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateCharge(c.id, { kind: c.kind === "charge" ? "discount" : "charge" })
                    }
                    aria-label={c.kind === "charge" ? "Switch to discount" : "Switch to charge"}
                    className={`pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                      c.kind === "discount"
                        ? "border-success text-success bg-success/10"
                        : "border-border text-text-muted"
                    }`}
                  >
                    {c.kind === "discount" ? (
                      <Minus className="size-4" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                  </button>
                  <Input
                    value={c.label}
                    onChange={(e) => updateCharge(c.id, { label: e.target.value })}
                    placeholder={
                      c.kind === "discount" ? "e.g. Early-bird discount" : "e.g. Extra bed"
                    }
                    aria-label="Description"
                    className="h-9 min-w-0 flex-1"
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={c.amount}
                    onChange={(e) => updateCharge(c.id, { amount: Number(e.target.value) || 0 })}
                    aria-label="Amount"
                    className="h-9 w-28 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeCharge(c.id)}
                    aria-label="Remove"
                    className="text-danger hover:bg-danger/10 pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => addCharge("charge")}
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add charge
          </button>
          <button
            type="button"
            onClick={() => addCharge("discount")}
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Minus className="size-3.5" aria-hidden="true" />
            Add discount
          </button>
        </div>
      </div>

      <div className="border-border flex items-center justify-between border-t pt-3">
        <Label>Total</Label>
        <span className="tabular text-lg font-semibold">{money(total, currency)}</span>
      </div>
    </div>
  );
}
