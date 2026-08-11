import "server-only";

import { nanoid } from "nanoid";

import type { createClient } from "@/lib/supabase/server";
import type { BookingSource } from "@/lib/types/database";

export type CreateBookingParams = {
  propertyId: string;
  /** Set when converting an enquiry; omitted for a manually created booking. */
  enquiryId?: string | null;
  guestName: string | null;
  phone: string | null;
  guests: number;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  notes?: string | null;
  /** Where this booking actually came from. Defaults to 'direct'. */
  source?: BookingSource;
  /**
   * Whether this row should occupy the dates (checked by the
   * bookings_no_overlap constraint, exported to the iCal feed). Defaults to
   * true — the normal case. False is for recording a guest on a channel
   * that already blocks these dates itself, e.g. an Airbnb reservation
   * during a period Airbnb's own iCal sync already marks unavailable here.
   */
  blocksCalendar?: boolean;
  /** addon_services ids to copy in as `requested` booking_addons. */
  addonIds?: string[];
};

export type CreateBookingResult =
  | { error: string; bookingId?: undefined }
  | { error?: undefined; bookingId: string };

/** A fresh guest-portal token + its expiry, 7 days past checkout. */
export function newPortalToken(checkOut: string): { token: string; expiresAt: string } {
  const tokenExpires = new Date(checkOut);
  tokenExpires.setDate(tokenExpires.getDate() + 7);
  return { token: nanoid(12), expiresAt: tokenExpires.toISOString() };
}

/** Shared by createDirectBooking and the block-conversion flow. */
export async function copyAddonsToBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  addonIds: string[],
): Promise<void> {
  if (!addonIds.length) return;
  const { data: addons } = await supabase
    .from("addon_services")
    .select("id, name, price")
    .in("id", addonIds);

  if (addons?.length) {
    await supabase.from("booking_addons").insert(
      addons.map((a) => ({
        booking_id: bookingId,
        addon_service_id: a.id,
        name: a.name,
        price: a.price ?? 0,
        qty: 1,
        status: "requested" as const,
      })),
    );
  }
}

/**
 * The one place a confirmed direct booking gets created — generates the
 * guest-portal token, inserts the row, and copies add-ons across. The
 * enquiry-conversion flow, the admin's manual "guest enquired off-platform"
 * flow, and the "add guest details" flow off an Airbnb-synced calendar block
 * all funnel through this, so the token expiry, the overlap error message
 * and the add-on copying can never drift between them.
 *
 * Relies on the bookings_no_overlap exclusion constraint as the final word on
 * double-booking — if two admins create overlapping bookings at once, the
 * database rejects the second insert rather than silently double-booking.
 * That constraint only looks at rows with blocks_calendar = true, so a
 * blocks_calendar: false booking (an already-synced channel) can never hit
 * it, including against another blocks_calendar: false booking for the same
 * dates — deliberately, since one Airbnb-blocked range can be several
 * separate bookings in a series.
 */
export async function createDirectBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: CreateBookingParams,
): Promise<CreateBookingResult> {
  const {
    propertyId,
    enquiryId = null,
    guestName,
    phone,
    guests,
    checkIn,
    checkOut,
    totalAmount,
    notes,
    source = "direct",
    blocksCalendar = true,
    addonIds,
  } = params;

  if (!(checkOut > checkIn)) {
    return { error: "Check-out must be after check-in." };
  }

  const { token, expiresAt } = newPortalToken(checkOut);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      property_id: propertyId,
      enquiry_id: enquiryId,
      source,
      blocks_calendar: blocksCalendar,
      guest_name: guestName,
      phone,
      guests,
      check_in: checkIn,
      check_out: checkOut,
      status: "confirmed",
      total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
      notes: notes || null,
      portal_token: token,
      token_expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (bookingError) {
    // 23P01 = the exclusion constraint: these dates overlap an existing
    // confirmed/completed booking that occupies them for this property.
    if (bookingError.code === "23P01") {
      return {
        error: "Those dates overlap with an existing booking for this property.",
      };
    }
    return { error: bookingError.message };
  }

  if (addonIds?.length) {
    await copyAddonsToBooking(supabase, booking.id, addonIds);
  }

  return { bookingId: booking.id };
}
