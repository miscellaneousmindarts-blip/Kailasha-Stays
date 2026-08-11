import "server-only";

import { nightsBetween, parseISODate } from "@/lib/date-utils";
import type { BookingCharge, BookingChargeKind, NightlyRateEntry } from "@/lib/types/database";

const MAX_CHARGES = 20;
const MAX_LABEL_LENGTH = 100;

export type ParsedBookingPricing =
  | { ok: false; error: string }
  | { ok: true; nightlyRates: NightlyRateEntry[]; charges: BookingCharge[] };

/**
 * Reads and validates the two hidden JSON inputs BookingPriceEditor submits.
 * The one gate every creation and edit path goes through before the number
 * reaches bookingTotal() — malformed input becomes a clear error here
 * rather than a silently wrong total three functions later.
 *
 * checkIn/checkOut are passed separately (not trusted from the payload
 * itself) specifically to catch a stale submission: if the admin somehow
 * submits a breakdown for a different date range than the booking is
 * actually being saved with — a race with another tab, a bug in the client
 * — this rejects it instead of saving a total that doesn't describe the
 * dates.
 */
export function parseBookingPricingInput(
  formData: FormData,
  checkIn: string,
  checkOut: string,
): ParsedBookingPricing {
  let rawNightly: unknown;
  let rawCharges: unknown;
  try {
    rawNightly = JSON.parse(String(formData.get("nightly_rates") ?? "[]"));
    rawCharges = JSON.parse(String(formData.get("charges") ?? "[]"));
  } catch {
    return { ok: false, error: "Could not read the price breakdown — refresh and try again." };
  }

  if (!Array.isArray(rawNightly) || !Array.isArray(rawCharges)) {
    return { ok: false, error: "Could not read the price breakdown — refresh and try again." };
  }

  const expectedNights = nightsBetween(parseISODate(checkIn), parseISODate(checkOut));
  if (rawNightly.length !== expectedNights) {
    return {
      ok: false,
      error: "The price breakdown doesn't match the selected dates — refresh and try again.",
    };
  }

  const nightlyRates: NightlyRateEntry[] = [];
  for (const entry of rawNightly) {
    const date = typeof entry?.date === "string" ? entry.date : null;
    const rate = Number(entry?.rate);
    if (!date || !Number.isFinite(rate) || rate < 0) {
      return { ok: false, error: "One of the nightly rates isn't a valid amount." };
    }
    nightlyRates.push({ date, rate });
  }

  if (rawCharges.length > MAX_CHARGES) {
    return { ok: false, error: `Keep it to ${MAX_CHARGES} charges and discounts or fewer.` };
  }

  const charges: BookingCharge[] = [];
  for (const entry of rawCharges) {
    const amount = Number(entry?.amount);
    const kind: BookingChargeKind = entry?.kind === "discount" ? "discount" : "charge";
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, error: "One of the charges or discounts isn't a valid amount." };
    }
    if (amount === 0) continue; // an added-then-untouched row — drop it silently, not an error
    const label =
      String(entry?.label ?? "").trim().slice(0, MAX_LABEL_LENGTH) ||
      (kind === "discount" ? "Discount" : "Additional charge");
    charges.push({
      id: typeof entry?.id === "string" ? entry.id : crypto.randomUUID(),
      label,
      kind,
      amount,
    });
  }

  return { ok: true, nightlyRates, charges };
}
