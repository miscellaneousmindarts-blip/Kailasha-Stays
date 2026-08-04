"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { useSaveAction } from "@/components/admin/use-save-action";
import { createManualBooking } from "@/app/admin/(dashboard)/bookings/actions";
import { parseISODate } from "@/lib/date-utils";
import { money } from "@/lib/format";
import { quoteStay } from "@/lib/pricing";
import type {
  PropertyAddonOption,
  PropertyOption,
  PropertyPricing,
} from "@/lib/admin/queries";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewBookingForm({
  properties,
  pricing,
  addonsByProperty,
}: {
  properties: PropertyOption[];
  pricing: Record<string, PropertyPricing>;
  addonsByProperty: Record<string, PropertyAddonOption[]>;
}) {
  const action = useSaveAction(createManualBooking);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const propertyPricing = pricing[propertyId] ?? null;
  const addons = addonsByProperty[propertyId] ?? [];
  const currency = propertyPricing?.currency ?? "INR";
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn);

  const quote = useMemo(() => {
    if (!propertyPricing || !datesValid) return null;
    return quoteStay({
      checkIn: parseISODate(checkIn),
      checkOut: parseISODate(checkOut),
      periods: propertyPricing.rate_periods,
      defaults: { base: propertyPricing.base_price, airbnb: propertyPricing.airbnb_base_price },
    });
  }, [propertyPricing, datesValid, checkIn, checkOut]);

  const suggested = quote && quote.direct.total !== null ? quote.direct.total : null;

  // Keeps total_amount in sync with the suggested price as dates or the
  // property change, but only while the admin hasn't typed their own number
  // over it — same rule as convert-to-booking-form.tsx, so the two forms
  // that create a direct booking behave identically.
  const [lastSuggested, setLastSuggested] = useState<number | null>(null);
  if (suggested !== lastSuggested) {
    if (totalAmount === "" || totalAmount === String(lastSuggested ?? "")) {
      setTotalAmount(suggested !== null ? String(suggested) : "");
    }
    setLastSuggested(suggested);
  }

  const isAutoFilled = totalAmount !== "" && totalAmount === String(suggested ?? "");

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectedAddonsTotal = addons
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + (a.price ?? 0), 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.run(new FormData(e.currentTarget));
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="property_id">Property</Label>
        <select
          id="property_id"
          name="property_id"
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setSelectedAddonIds([]);
          }}
          required
          className="border-border h-11 w-full rounded-md border bg-transparent px-3"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="guest_name">Guest name</Label>
          <Input id="guest_name" name="guest_name" required className="h-11" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" required className="h-11" />
        </div>
      </div>
      <p className="text-text-muted -mt-3 text-sm">
        The confirmation link goes out over WhatsApp to this number, same as
        any other booking.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="check_in">Check-in</Label>
          <Input
            id="check_in"
            name="check_in"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="check_out">Check-out</Label>
          <Input
            id="check_out"
            name="check_out"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="guests">Guests</Label>
        <Input id="guests" name="guests" type="number" min={1} defaultValue={2} className="h-11" />
      </div>

      {quote && quote.direct.total !== null ? (
        <div className="border-border rounded-md border p-3">
          <PriceBreakdown quote={quote} currency={currency} />
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="total_amount">Total amount (stay only, {currency})</Label>
        <Input
          id="total_amount"
          name="total_amount"
          type="number"
          min={0}
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="0"
          className="h-11"
        />
        {isAutoFilled ? (
          <p className="text-text-muted flex items-center gap-1.5 text-sm">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            Auto-filled from the property&apos;s rates — edit if you agreed a
            different price.
          </p>
        ) : suggested === null && propertyPricing && datesValid ? (
          <p className="text-text-muted text-sm">
            No rate set for these dates — enter the agreed price manually.
          </p>
        ) : null}
      </div>

      {addons.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Add-ons</p>
          <div className="space-y-1.5">
            {addons.map((a) => (
              <label
                key={a.id}
                className="border-border flex items-center gap-2 rounded-md border p-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  name="addon_ids"
                  value={a.id}
                  checked={selectedAddonIds.includes(a.id)}
                  onChange={() => toggleAddon(a.id)}
                  className="size-4"
                />
                <span className="flex-1">{a.name}</span>
                <span className="text-text-muted">{money(a.price ?? 0, currency)}</span>
              </label>
            ))}
          </div>
          {selectedAddonIds.length ? (
            <p className="text-text-muted text-sm">
              Plus add-ons: {money(selectedAddonsTotal, currency)} — confirm
              their prices on the booking page after creating it.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="notes">Notes (internal only, not shown to the guest)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="How they reached out, anything agreed verbally…"
        />
      </div>

      {action.error ? (
        <p role="alert" className="text-danger text-sm">
          {action.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={action.pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 items-center justify-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
      >
        {action.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Create booking
      </button>
    </form>
  );
}
