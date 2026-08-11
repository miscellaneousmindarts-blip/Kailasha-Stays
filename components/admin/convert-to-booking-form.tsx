"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookingPriceEditor } from "@/components/admin/booking-price-editor";
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
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn);

  const quote = useMemo(() => {
    if (!pricing || !datesValid) return null;
    return quoteStay({
      checkIn: parseISODate(checkIn),
      checkOut: parseISODate(checkOut),
      periods: pricing.rate_periods,
      defaults: { base: pricing.base_price },
    });
  }, [checkIn, checkOut, pricing, datesValid]);

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

      <div className="space-y-1">
        <Label>Price</Label>
        {datesValid ? (
          <BookingPriceEditor
            checkIn={checkIn}
            checkOut={checkOut}
            currency={currency}
            suggestedNightly={quote?.nightly ?? []}
          />
        ) : (
          <p className="text-text-muted text-sm">
            Pick check-in and check-out dates to set the price.
          </p>
        )}
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
