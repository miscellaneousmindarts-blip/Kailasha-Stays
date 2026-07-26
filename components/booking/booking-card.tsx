"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { DatePickerField } from "@/components/booking/date-picker-field";
import { GuestStepper } from "@/components/booking/guest-stepper";
import { BookDirectDialog } from "@/components/booking/book-direct-dialog";
import type { UnavailableRange } from "@/components/booking/availability-calendar";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { nightsBetween } from "@/lib/date-utils";
import type { AddonServiceData } from "@/lib/queries";

export function BookingCard({
  propertyId,
  propertyTitle,
  maxGuests,
  basePrice,
  currency,
  airbnbUrl,
  bookingComUrl,
  whatsappNumber,
  addons,
}: {
  propertyId: string;
  propertyTitle: string;
  maxGuests: number;
  basePrice: number | null;
  currency: string;
  airbnbUrl: string | null;
  bookingComUrl: string | null;
  whatsappNumber: string | null;
  addons: AddonServiceData[];
}) {
  const [unavailable, setUnavailable] = useState<UnavailableRange[]>([]);
  const [range, setRange] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(Math.min(2, maxGuests));
  const [dialogOpen, setDialogOpen] = useState(false);
  // Bumping this forces both DatePickerField instances (desktop card + mobile
  // bar) to remount, which resets their independent internal popover state to
  // closed. They're each uncontrolled, so this is simpler and safer than a
  // shared "open" boolean: Radix portals a popover's content to <body>
  // regardless of its trigger's own hidden ancestors, so sharing one open
  // flag between the CSS-hidden desktop/mobile instances made both render
  // their calendar content at once — this avoids that entirely.
  const [dateFieldKey, setDateFieldKey] = useState(0);

  function openBookDirect() {
    // the booking dialog must be the only open overlay — never leave the
    // date popover open (and focusable) behind it
    setDateFieldKey((k) => k + 1);
    setDialogOpen(true);
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .rpc("get_unavailable_dates", { p_property_id: propertyId })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setUnavailable(data);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const price = money(basePrice, currency);
  const hasDates = Boolean(range.checkIn && range.checkOut);
  const nights =
    range.checkIn && range.checkOut
      ? nightsBetween(range.checkIn, range.checkOut)
      : null;
  const canBookDirect = hasDates && Boolean(whatsappNumber);

  const platformButtons = (
    <>
      {airbnbUrl ? (
        <a
          href={airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border font-medium"
        >
          Book on Airbnb
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : null}
      {bookingComUrl ? (
        <a
          href={bookingComUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border font-medium"
        >
          Book on Booking.com
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : null}
    </>
  );

  return (
    <>
      {/* desktop card */}
      <div className="border-border shadow-raised hidden rounded-lg border p-6 lg:sticky lg:top-24 lg:block">
        <BookingCardBody
          price={price}
          hasDates={hasDates}
          nights={nights}
          unavailable={unavailable}
          range={range}
          setRange={setRange}
          guests={guests}
          setGuests={setGuests}
          maxGuests={maxGuests}
          canBookDirect={canBookDirect}
          whatsappNumber={whatsappNumber}
          onBookDirect={openBookDirect}
          platformButtons={platformButtons}
          dateFieldKey={dateFieldKey}
        />
      </div>

      {/* mobile bottom bar */}
      <div className="border-border bg-background fixed inset-x-0 bottom-0 z-30 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {price ? (
              <p className="truncate">
                <span className="tabular font-semibold">{price}</span>
                <span className="text-text-muted"> / night</span>
              </p>
            ) : null}
            <DatePickerField
              key={dateFieldKey}
              unavailable={unavailable}
              value={range}
              onChange={setRange}
              variant="compact"
            />
          </div>
          {canBookDirect ? (
            <button
              type="button"
              onClick={openBookDirect}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 shrink-0 items-center rounded-md px-6 font-medium"
            >
              Book Direct
            </button>
          ) : airbnbUrl ? (
            <a
              href={airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 shrink-0 items-center rounded-md px-6 font-medium"
            >
              Book on Airbnb
            </a>
          ) : null}
        </div>
      </div>

      {range.checkIn && range.checkOut && whatsappNumber ? (
        <BookDirectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          checkIn={range.checkIn}
          checkOut={range.checkOut}
          guests={guests}
          addons={addons}
          whatsappNumber={whatsappNumber}
        />
      ) : null}
    </>
  );
}

function BookingCardBody({
  price,
  hasDates,
  nights,
  unavailable,
  range,
  setRange,
  guests,
  setGuests,
  maxGuests,
  canBookDirect,
  whatsappNumber,
  onBookDirect,
  platformButtons,
  dateFieldKey,
}: {
  price: string | null;
  hasDates: boolean;
  nights: number | null;
  unavailable: UnavailableRange[];
  range: { checkIn: Date | null; checkOut: Date | null };
  setRange: (r: { checkIn: Date | null; checkOut: Date | null }) => void;
  guests: number;
  setGuests: (n: number) => void;
  maxGuests: number;
  canBookDirect: boolean;
  whatsappNumber: string | null;
  onBookDirect: () => void;
  platformButtons: React.ReactNode;
  dateFieldKey: number;
}) {
  return (
    <>
      <div className="mb-4">
        {price ? (
          <p>
            <span className="tabular text-xl font-semibold">{price}</span>
            <span className="text-text-muted"> / night</span>
          </p>
        ) : (
          <p className="font-medium">Ask us for the current rate</p>
        )}
        {hasDates ? (
          <p className="text-text-muted mt-1 text-sm">
            {nights} {nights === 1 ? "night" : "nights"} selected
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <DatePickerField
          key={dateFieldKey}
          unavailable={unavailable}
          value={range}
          onChange={setRange}
        />
        <div className="border-border rounded-md border px-4 py-3">
          <GuestStepper value={guests} max={maxGuests} onChange={setGuests} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {canBookDirect ? (
          <button
            type="button"
            onClick={onBookDirect}
            className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 w-full items-center justify-center rounded-md font-medium"
          >
            Book Direct
          </button>
        ) : !whatsappNumber ? (
          <p className="text-text-muted bg-surface-subtle rounded-md p-3 text-center text-sm">
            Direct booking is being set up — please book on Airbnb.
          </p>
        ) : (
          <button
            type="button"
            disabled
            className="bg-primary text-primary-foreground pressable flex h-12 w-full items-center justify-center rounded-md font-medium opacity-40"
          >
            Add dates to book directly
          </button>
        )}
        {platformButtons}
      </div>

      {canBookDirect ? (
        <p className="text-text-muted mt-3 text-center text-sm">
          No payment now — confirm on WhatsApp.
        </p>
      ) : null}
    </>
  );
}
