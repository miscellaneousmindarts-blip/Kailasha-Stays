"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarOff, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookingPriceEditor } from "@/components/admin/booking-price-editor";
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
import type { BookingSource } from "@/lib/types/database";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const SOURCES: { value: BookingSource; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "airbnb", label: "Airbnb" },
  { value: "booking_com", label: "Booking.com" },
  { value: "other", label: "Other platform" },
];

/**
 * Whether a booking on this source should occupy the calendar by default.
 *
 * Airbnb and Booking.com normally have their own iCal sync already blocking
 * the dates here — blocking again would be redundant, and since our own
 * export feeds back into what an owner imports into Airbnb, a genuine
 * double-block risk, not just a cosmetic one. A platform with no sync (or
 * an off-platform guest) has nothing else holding the dates, so this has to.
 */
function defaultBlocksCalendar(source: BookingSource): boolean {
  return source !== "airbnb" && source !== "booking_com";
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
  const params = useSearchParams();
  const convertBlockId = params.get("convert_block_id");
  const prefilledSource = params.get("source") as BookingSource | null;
  const prefilledBlocks = params.get("blocks_calendar");

  const action = useSaveAction(createManualBooking);

  const [propertyId, setPropertyId] = useState(
    params.get("property_id") ?? properties[0]?.id ?? "",
  );
  const [checkIn, setCheckIn] = useState(params.get("check_in") ?? todayISO());
  const [checkOut, setCheckOut] = useState(params.get("check_out") ?? "");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [source, setSource] = useState<BookingSource>(
    prefilledSource && SOURCES.some((s) => s.value === prefilledSource)
      ? prefilledSource
      : "direct",
  );
  const [blocksCalendar, setBlocksCalendar] = useState(
    prefilledBlocks !== null
      ? prefilledBlocks !== "false"
      : defaultBlocksCalendar(source),
  );

  // Converting a block: dates and property are the block's own and aren't
  // up for negotiation here — changing them would mean this "conversion"
  // no longer describes the row it's converting. blocks_calendar stays
  // true too: this booking has no calendar sync of its own to lean on, it
  // IS what's holding the dates (it was already doing that as a block).
  const locked = Boolean(convertBlockId);
  // Only a block conversion forces this — there's no other row standing in
  // for the block being replaced, so it has to stay checked. Direct just
  // defaults checked like every non-synced source; the admin can still
  // uncheck it for whatever reason they have.
  const blockingForced = locked;

  function selectSource(next: BookingSource) {
    setSource(next);
    if (!locked) setBlocksCalendar(defaultBlocksCalendar(next));
  }

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
      defaults: { base: propertyPricing.base_price },
    });
  }, [propertyPricing, datesValid, checkIn, checkOut]);

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
      {convertBlockId ? <input type="hidden" name="convert_block_id" value={convertBlockId} /> : null}

      <div className="space-y-2">
        <Label htmlFor="property_id">Property</Label>
        {locked ? (
          <>
            <p className="border-border bg-surface-subtle text-text-muted flex h-11 items-center rounded-md border px-3">
              {properties.find((p) => p.id === propertyId)?.title ?? "This property"}
            </p>
            <input type="hidden" name="property_id" value={propertyId} />
          </>
        ) : (
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
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Where this booking is from</legend>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => selectSource(s.value)}
              aria-pressed={source === s.value}
              className={`pressable flex h-10 items-center rounded-md border px-3 text-sm font-medium ${
                source === s.value
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border hover:bg-surface-subtle"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="source" value={source} />
        <p className="text-text-muted text-sm">
          {source === "direct"
            ? "The guest booked with you directly."
            : "Recorded here for the guest-portal link, ID upload and add-ons — the booking itself was made elsewhere."}
        </p>
      </fieldset>

      {blockingForced ? (
        <p className="text-text-muted flex items-center gap-1.5 text-sm">
          <CalendarOff className="size-3.5 shrink-0" aria-hidden="true" />
          These dates stay blocked — this is filling in who they&apos;re for.
        </p>
      ) : (
        <label className="border-border flex items-start gap-3 rounded-md border p-3">
          <input
            type="checkbox"
            checked={blocksCalendar}
            onChange={(e) => setBlocksCalendar(e.target.checked)}
            className="mt-0.5 size-4"
          />
          <span className="text-sm">
            <span className="block font-medium">Block these dates here too</span>
            <span className="text-text-muted mt-0.5 block">
              {source === "airbnb" || source === "booking_com"
                ? `Leave this off if ${
                    source === "airbnb" ? "Airbnb" : "Booking.com"
                  } already syncs its own calendar to this property — turning it on as well would double-block, and could feed back into what you import there.`
                : "Nothing else is holding these dates, so this booking needs to."}
            </span>
          </span>
        </label>
      )}
      <input
        type="hidden"
        name="blocks_calendar"
        value={blockingForced || blocksCalendar ? "true" : "false"}
      />

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
            disabled={locked}
            className="h-11 disabled:opacity-70"
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
            disabled={locked}
            className="h-11 disabled:opacity-70"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="guests">Guests</Label>
        <Input id="guests" name="guests" type="number" min={1} defaultValue={2} className="h-11" />
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
        {locked ? "Add guest details" : "Create booking"}
      </button>
    </form>
  );
}
