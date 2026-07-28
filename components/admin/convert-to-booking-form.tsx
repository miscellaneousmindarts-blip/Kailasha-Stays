"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { useSaveAction } from "@/components/admin/use-save-action";
import { convertEnquiryToBooking } from "@/app/admin/(dashboard)/enquiries/actions";
import { parseISODate } from "@/lib/date-utils";
import { money } from "@/lib/format";
import { quoteStay } from "@/lib/pricing";
import type { EnquiryRow, PropertyPricing } from "@/lib/admin/queries";
import type { AddonServiceData } from "@/lib/queries";

export function ConvertToBookingForm({
  enquiry,
  addons,
  pricing,
  onCancel,
}: {
  enquiry: EnquiryRow;
  addons: AddonServiceData[];
  pricing: PropertyPricing | null;
  onCancel: () => void;
}) {
  const action = useSaveAction(convertEnquiryToBooking);
  const estimatedAddonsTotal = addons.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const currency = pricing?.currency ?? "INR";

  const [checkIn, setCheckIn] = useState(enquiry.check_in);
  const [checkOut, setCheckOut] = useState(enquiry.check_out);
  const [totalAmount, setTotalAmount] = useState("");

  const quote = useMemo(() => {
    if (!pricing) return null;
    return quoteStay({
      checkIn: parseISODate(checkIn),
      checkOut: parseISODate(checkOut),
      periods: pricing.rate_periods,
      defaults: { base: pricing.base_price, airbnb: pricing.airbnb_base_price },
    });
  }, [checkIn, checkOut, pricing]);

  const suggested = quote && quote.direct.total !== null ? quote.direct.total : null;

  // Keeps total_amount in sync with the suggested price as dates change,
  // but only while the admin hasn't typed their own number over it — done
  // during render (not an effect) so the field never visibly lags a
  // keystroke behind the date change. Comparing against the LAST suggestion
  // (not just "is it empty") is what lets a manual edit stick even if the
  // admin then nudges the dates again.
  const [lastSuggested, setLastSuggested] = useState<number | null>(null);
  if (suggested !== lastSuggested) {
    if (totalAmount === "" || totalAmount === String(lastSuggested ?? "")) {
      setTotalAmount(suggested !== null ? String(suggested) : "");
    }
    setLastSuggested(suggested);
  }

  const isAutoFilled = totalAmount !== "" && totalAmount === String(suggested ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        action.run(enquiry.id, new FormData(e.currentTarget));
      }}
      className="space-y-5"
    >
      <p className="text-text-muted text-sm">
        Creates a confirmed booking and a guest portal link. The dates are
        checked against existing bookings before saving.
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
        <Input
          id="guests"
          name="guests"
          type="number"
          min={1}
          defaultValue={enquiry.guests}
          className="h-11"
        />
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
        ) : suggested === null && pricing ? (
          <p className="text-text-muted text-sm">
            No rate set for these dates — enter the agreed price manually.
          </p>
        ) : null}
        {addons.length ? (
          <p className="text-text-muted text-sm">
            Plus requested add-ons (~{money(estimatedAddonsTotal, currency)}) —
            confirm their prices on the booking page after creating it.
          </p>
        ) : null}
      </div>

      {action.error ? (
        <p role="alert" className="text-danger text-sm">
          {action.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={action.pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-md font-medium disabled:opacity-60"
        >
          {action.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Create booking
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-border hover:bg-surface-subtle pressable flex h-12 items-center rounded-md border px-5 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
