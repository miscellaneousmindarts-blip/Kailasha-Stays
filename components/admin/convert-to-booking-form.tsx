"use client";

import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveAction } from "@/components/admin/use-save-action";
import { convertEnquiryToBooking } from "@/app/admin/(dashboard)/enquiries/actions";
import type { EnquiryRow } from "@/lib/admin/queries";
import type { AddonServiceData } from "@/lib/queries";

export function ConvertToBookingForm({
  enquiry,
  addons,
  onCancel,
}: {
  enquiry: EnquiryRow;
  addons: AddonServiceData[];
  onCancel: () => void;
}) {
  const action = useSaveAction(convertEnquiryToBooking);
  const estimatedAddonsTotal = addons.reduce((sum, a) => sum + (a.price ?? 0), 0);

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
            defaultValue={enquiry.check_in}
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
            defaultValue={enquiry.check_out}
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
        <Label htmlFor="total_amount">Total amount (stay only, ₹)</Label>
        <Input
          id="total_amount"
          name="total_amount"
          type="number"
          min={0}
          placeholder="0"
          className="h-11"
        />
        {addons.length ? (
          <p className="text-text-muted text-sm">
            Plus requested add-ons (~₹{estimatedAddonsTotal.toLocaleString("en-IN")})
            — confirm their prices on the booking page after creating it.
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
