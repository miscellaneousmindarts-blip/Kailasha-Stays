"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Tag } from "lucide-react";

import { DatePickerField } from "@/components/booking/date-picker-field";
import { GuestStepper } from "@/components/booking/guest-stepper";
import { BookDirectDialog } from "@/components/booking/book-direct-dialog";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { CompareChannelsSheet } from "@/components/booking/compare-channels-sheet";
import type { UnavailableRange } from "@/components/booking/availability-calendar";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/format";
import { lowestNightlyRate, quoteStay, type Quote } from "@/lib/pricing";
import type { AddonServiceData, PublicBookingChannel } from "@/lib/queries";
import type { RatePeriod } from "@/lib/types/database";

export function BookingCard({
  propertyId,
  propertyTitle,
  maxGuests,
  basePrice,
  ratePeriods,
  currency,
  channels,
  whatsappNumber,
  addons,
}: {
  propertyId: string;
  propertyTitle: string;
  maxGuests: number;
  basePrice: number | null;
  ratePeriods: RatePeriod[];
  currency: string;
  channels: PublicBookingChannel[];
  whatsappNumber: string | null;
  addons: AddonServiceData[];
}) {
  const [unavailable, setUnavailable] = useState<UnavailableRange[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [range, setRange] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(Math.min(2, maxGuests));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  // Separate open state per instance: the desktop card and the mobile bar each
  // render their own DatePickerField, and Radix portals popover content to
  // <body> regardless of a CSS-hidden trigger — one shared flag would pop both.
  const [desktopPicker, setDesktopPicker] = useState(false);
  const [mobilePicker, setMobilePicker] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .rpc("get_unavailable_dates", { p_property_id: propertyId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setUnavailable(data);
        setLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const defaults = useMemo(() => ({ base: basePrice }), [basePrice]);

  const hasDates = Boolean(range.checkIn && range.checkOut);

  const quote = useMemo<Quote | null>(() => {
    if (!range.checkIn || !range.checkOut) return null;
    return quoteStay({
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      periods: ratePeriods,
      defaults,
      channels,
    });
  }, [range.checkIn, range.checkOut, ratePeriods, defaults, channels]);

  const fromRate = useMemo(
    () => lowestNightlyRate(ratePeriods, defaults),
    [ratePeriods, defaults],
  );

  const canBookDirect = hasDates && Boolean(whatsappNumber);

  function openCompare() {
    setDesktopPicker(false);
    setMobilePicker(false);
    setCompareOpen(true);
  }

  function openBookDirect() {
    // The dialog must be the only overlay — never leave a calendar popover
    // open and focusable behind it.
    setDesktopPicker(false);
    setMobilePicker(false);
    setDialogOpen(true);
  }

  return (
    <>
      {/* desktop card */}
      <div className="border-border shadow-raised hidden rounded-lg border p-6 lg:sticky lg:top-24 lg:block">
        <PriceHeadline quote={quote} fromRate={fromRate} currency={currency} />

        <div className="mt-4 space-y-3">
          <DatePickerField
            unavailable={unavailable}
            value={range}
            onChange={setRange}
            open={desktopPicker}
            onOpenChange={setDesktopPicker}
            loading={loadingAvailability}
          />
          <div className="border-border rounded-md border px-4 py-3">
            <GuestStepper value={guests} max={maxGuests} onChange={setGuests} />
          </div>
        </div>

        {quote ? (
          <div className="mt-4">
            <PriceBreakdown quote={quote} currency={currency} />
          </div>
        ) : null}

        <div className="mt-4">
          {hasDates ? (
            <ChannelCtas
              quote={quote}
              currency={currency}
              canBookDirect={canBookDirect}
              whatsappNumber={whatsappNumber}
              onBookDirect={openBookDirect}
              onCompare={openCompare}
            />
          ) : (
            <button
              type="button"
              onClick={() => setDesktopPicker(true)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 w-full items-center justify-center rounded-md font-medium"
            >
              Book now
            </button>
          )}
        </div>

        {hasDates && canBookDirect ? (
          <p className="text-text-muted mt-3 text-center text-sm">
            No payment now — confirm on WhatsApp.
          </p>
        ) : !hasDates ? (
          <p className="text-text-muted mt-3 text-center text-sm">
            Add dates to compare prices.
          </p>
        ) : null}
      </div>

      {/* mobile bottom bar */}
      <div className="border-border bg-background fixed inset-x-0 bottom-0 z-30 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {hasDates && quote ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate">
                {quote.direct.total !== null ? (
                  <>
                    <span
                      key={quote.direct.total}
                      className="tabular value-in inline-block font-semibold"
                    >
                      {money(quote.direct.total, currency)}
                    </span>
                    <span className="text-text-muted text-sm">
                      {" "}
                      total · {quote.nights}{" "}
                      {quote.nights === 1 ? "night" : "nights"}
                    </span>
                  </>
                ) : (
                  <span className="text-text-muted text-sm">
                    {quote.nights} {quote.nights === 1 ? "night" : "nights"}
                  </span>
                )}
              </p>
              {/* The date field is its own trigger — it anchors the calendar
                  popover and doubles as the "change dates" affordance. */}
              <div className="shrink-0">
                <DatePickerField
                  unavailable={unavailable}
                  value={range}
                  onChange={setRange}
                  variant="compact"
                  open={mobilePicker}
                  onOpenChange={setMobilePicker}
                  loading={loadingAvailability}
                />
              </div>
            </div>

            <ChannelCtas
              quote={quote}
              currency={currency}
              canBookDirect={canBookDirect}
              whatsappNumber={whatsappNumber}
              onBookDirect={openBookDirect}
              onCompare={openCompare}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {fromRate !== null ? (
                <p className="truncate">
                  <span className="text-text-muted text-sm">from </span>
                  <span className="tabular font-semibold">
                    {money(fromRate, currency)}
                  </span>
                  <span className="text-text-muted text-sm"> / night</span>
                </p>
              ) : (
                <p className="truncate text-sm font-medium">
                  Ask us for the rate
                </p>
              )}
              {/* Doubles as the popover anchor for the Book now button. */}
              <DatePickerField
                unavailable={unavailable}
                value={range}
                onChange={setRange}
                variant="compact"
                open={mobilePicker}
                onOpenChange={setMobilePicker}
                loading={loadingAvailability}
              />
            </div>
            <button
              type="button"
              onClick={() => setMobilePicker(true)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 shrink-0 items-center rounded-md px-6 font-medium"
            >
              Book now
            </button>
          </div>
        )}
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

      {quote ? (
        <CompareChannelsSheet
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          quote={quote}
          currency={currency}
          canBookDirect={canBookDirect}
          onBookDirect={openBookDirect}
        />
      ) : null}
    </>
  );
}

/** Headline figure: a real total once dates exist, otherwise a "from" rate. */
function PriceHeadline({
  quote,
  fromRate,
  currency,
}: {
  quote: Quote | null;
  fromRate: number | null;
  currency: string;
}) {
  if (quote && quote.direct.total !== null) {
    return (
      <div>
        <p>
          {/* keyed so the figure re-runs its settle animation on every change */}
          <span
            key={quote.direct.total}
            className="tabular value-in inline-block text-xl font-semibold"
          >
            {money(quote.direct.total, currency)}
          </span>
          <span className="text-text-muted"> total</span>
        </p>
        <p className="text-text-muted mt-1 text-sm">
          {quote.nights} {quote.nights === 1 ? "night" : "nights"}
          {quote.direct.perNight !== null
            ? ` · ${money(Math.round(quote.direct.perNight), currency)} / night avg`
            : ""}
        </p>
      </div>
    );
  }

  if (fromRate !== null) {
    return (
      <p>
        <span className="text-text-muted">from </span>
        <span className="tabular text-xl font-semibold">
          {money(fromRate, currency)}
        </span>
        <span className="text-text-muted"> / night</span>
      </p>
    );
  }

  return <p className="font-medium">Ask us for the current rate</p>;
}

/**
 * What the guest actually chooses between, once dates are known.
 *
 * ONE primary action — book direct — and everything else behind a single
 * comparison row. An owner can list on five platforms; five stacked
 * full-width buttons would bury the action we most want taken and would not
 * fit the mobile bar at all. The comparison row still leads with the number
 * that matters (the best saving), so the case for direct is made inline and
 * the sheet only has to back it up.
 */
function ChannelCtas({
  quote,
  currency,
  canBookDirect,
  whatsappNumber,
  onBookDirect,
  onCompare,
}: {
  quote: Quote | null;
  currency: string;
  canBookDirect: boolean;
  whatsappNumber: string | null;
  onBookDirect: () => void;
  onCompare: () => void;
}) {
  const directTotal = quote?.direct.total ?? null;
  const saving = quote?.savingVsCheapest ?? null;
  const channels = quote?.channels ?? [];

  // The single cheapest alternative, for naming the comparison concretely —
  // "₹1,100 more on Airbnb" beats "compare 3 options".
  const cheapestAlt = channels.find((c) => c.total !== null) ?? null;

  return (
    <div className="space-y-2">
      {canBookDirect ? (
        <button
          type="button"
          onClick={onBookDirect}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 font-medium"
        >
          <span>Book directly</span>
          {directTotal !== null ? (
            <>
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
              <span key={directTotal} className="tabular value-in inline-block">
                {money(directTotal, currency)}
              </span>
            </>
          ) : null}
        </button>
      ) : !whatsappNumber && channels.length ? (
        <p className="text-text-muted bg-surface-subtle rounded-md p-3 text-center text-sm">
          Direct booking is being set up — see the other options below.
        </p>
      ) : null}

      {saving !== null && saving > 0 ? (
        <p
          key={saving}
          className="text-success value-in flex items-center justify-center gap-1.5 text-sm font-medium"
        >
          <Tag className="size-3.5 shrink-0" aria-hidden="true" />
          Save {money(saving, currency)} booking direct
        </p>
      ) : null}

      {channels.length ? (
        <button
          type="button"
          onClick={onCompare}
          className="border-border hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-between gap-2 rounded-md border px-4 text-left"
        >
          <span className="min-w-0 truncate text-sm font-medium">
            {cheapestAlt && cheapestAlt.total !== null ? (
              <>
                Also on {cheapestAlt.name}
                <span className="text-text-muted">
                  {" · "}
                  {money(cheapestAlt.total, currency)}
                </span>
              </>
            ) : (
              <>
                Other ways to book
                <span className="text-text-muted"> · {channels.length}</span>
              </>
            )}
          </span>
          <span className="text-text-muted flex shrink-0 items-center gap-1 text-sm">
            {channels.length > 1 ? `+${channels.length - 1} more` : "View"}
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
