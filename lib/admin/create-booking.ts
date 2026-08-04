import "server-only";

import { nanoid } from "nanoid";

import type { createClient } from "@/lib/supabase/server";

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
  /** addon_services ids to copy in as `requested` booking_addons. */
  addonIds?: string[];
};

export type CreateBookingResult =
  | { error: string; bookingId?: undefined }
  | { error?: undefined; bookingId: string };

/**
 * The one place a confirmed direct booking gets created — generates the
 * guest-portal token, inserts the row, and copies add-ons across. Both the
 * enquiry-conversion flow and the admin's manual "guest enquired
 * off-platform" flow funnel through this, so the token expiry, the overlap
 * error message and the add-on copying can never drift between the two.
 *
 * Relies on the bookings_no_overlap exclusion constraint as the final word on
 * double-booking — if two admins create overlapping bookings at once, the
 * database rejects the second insert rather than silently double-booking.
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
    addonIds,
  } = params;

  if (!(checkOut > checkIn)) {
    return { error: "Check-out must be after check-in." };
  }

  const token = nanoid(12);
  const tokenExpires = new Date(checkOut);
  tokenExpires.setDate(tokenExpires.getDate() + 7);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      property_id: propertyId,
      enquiry_id: enquiryId,
      source: "direct",
      guest_name: guestName,
      phone,
      guests,
      check_in: checkIn,
      check_out: checkOut,
      status: "confirmed",
      total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
      notes: notes || null,
      portal_token: token,
      token_expires_at: tokenExpires.toISOString(),
    })
    .select("id")
    .single();

  if (bookingError) {
    // 23P01 = the exclusion constraint: these dates overlap an existing
    // confirmed/completed booking for this property.
    if (bookingError.code === "23P01") {
      return {
        error: "Those dates overlap with an existing booking for this property.",
      };
    }
    return { error: bookingError.message };
  }

  if (addonIds?.length) {
    const { data: addons } = await supabase
      .from("addon_services")
      .select("id, name, price")
      .in("id", addonIds);

    if (addons?.length) {
      await supabase.from("booking_addons").insert(
        addons.map((a) => ({
          booking_id: booking.id,
          addon_service_id: a.id,
          name: a.name,
          price: a.price ?? 0,
          qty: 1,
          status: "requested" as const,
        })),
      );
    }
  }

  return { bookingId: booking.id };
}
