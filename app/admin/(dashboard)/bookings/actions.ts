"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/admin/auth";
import { parseBookingPricingInput } from "@/lib/admin/booking-pricing-input";
import {
  copyAddonsToBooking,
  createDirectBooking,
  newPortalToken,
} from "@/lib/admin/create-booking";
import { bookingTotal } from "@/lib/pricing";
import type { createClient } from "@/lib/supabase/server";
import type { BookingCharge, BookingSource, NightlyRateEntry } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/** 'blocked' is not a user-selectable creation source — it's what a manual block is. */
const CREATABLE_SOURCES: BookingSource[] = ["direct", "airbnb", "booking_com", "other"];

function revalidateBookingViews() {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
}

/**
 * For a guest recorded here without going through an enquiry — off-platform
 * (WhatsApp, phone, walk-in) or on another platform entirely (Airbnb,
 * Booking.com, ...), where this is still worth creating for the guest-portal
 * link, ID upload and add-ons. Two shapes:
 *
 *   - Fresh dates: creates a new booking (source + blocks_calendar chosen on
 *     the form — see NewBookingForm for why blocks_calendar defaults the way
 *     it does per source).
 *   - convert_block_id set: the admin picked "Add guest details" on an
 *     existing manual block, so this converts that SAME row into the
 *     booking instead of inserting a new one.
 *
 * Either way the price comes from BookingPriceEditor's two hidden JSON
 * inputs, parsed and validated by parseBookingPricingInput — there is no
 * separate total field to read instead.
 */
export async function createManualBooking(
  formData: FormData,
): Promise<ActionResult & { bookingId?: string }> {
  const propertyId = String(formData.get("property_id") ?? "");
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const checkIn = String(formData.get("check_in") ?? "");
  const checkOut = String(formData.get("check_out") ?? "");
  const guests = Number(formData.get("guests") ?? 1);
  const notes = String(formData.get("notes") ?? "").trim();
  const addonIds = formData.getAll("addon_ids").map(String);
  const convertBlockId = String(formData.get("convert_block_id") ?? "").trim() || null;

  const sourceRaw = String(formData.get("source") ?? "direct") as BookingSource;
  const source = CREATABLE_SOURCES.includes(sourceRaw) ? sourceRaw : "direct";
  const blocksCalendar = String(formData.get("blocks_calendar") ?? "true") !== "false";

  if (!guestName) return { error: "Enter the guest's name." };
  if (!phone) {
    return {
      error:
        "Enter the guest's phone number — the confirmation link is shared over WhatsApp.",
    };
  }

  const pricing = parseBookingPricingInput(formData, checkIn, checkOut);
  if (!pricing.ok) return { error: pricing.error };

  const { supabase } = await requireTenant();

  if (convertBlockId) {
    return convertBlockToBooking(supabase, convertBlockId, {
      guestName,
      phone,
      guests,
      notes,
      source,
      addonIds,
      nightlyRates: pricing.nightlyRates,
      charges: pricing.charges,
    });
  }

  if (!propertyId) return { error: "Choose a property." };

  const result = await createDirectBooking(supabase, {
    propertyId,
    guestName,
    phone,
    guests,
    checkIn,
    checkOut,
    notes,
    source,
    blocksCalendar,
    addonIds,
    nightlyRates: pricing.nightlyRates,
    charges: pricing.charges,
  });
  if (result.error) return { error: result.error };

  revalidateBookingViews();
  redirect(`/admin/bookings/${result.bookingId}`);
}

/**
 * Converts an existing manual block into a real booking — an UPDATE on the
 * SAME row, never a delete-then-insert.
 *
 * The ordering matters: the block and the booking being created from it both
 * have blocks_calendar = true and identical dates, so inserting a new row
 * would collide with the exclusion constraint against the very block it's
 * meant to replace. Deleting the block first to dodge that would leave the
 * dates completely unprotected for however long until the insert completes
 * — and unprotected forever if that insert then failed for any other
 * reason. Updating in place is atomic by construction: there is never a
 * moment with zero rows holding the dates, or two.
 */
async function convertBlockToBooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  blockId: string,
  fields: {
    guestName: string;
    phone: string;
    guests: number;
    notes: string;
    source: BookingSource;
    addonIds: string[];
    nightlyRates: NightlyRateEntry[];
    charges: BookingCharge[];
  },
): Promise<ActionResult & { bookingId?: string }> {
  // Keyed by a unique id, so RLS alone is enough here — same convention as
  // updateBookingDetails in bookings/[id]/actions.ts.
  const { data: block } = await supabase
    .from("bookings")
    .select("id, check_out, source")
    .eq("id", blockId)
    .maybeSingle();

  if (!block) return { error: "That block no longer exists." };
  if (block.source !== "blocked") {
    return { error: "That row isn't a manual block." };
  }

  const { token, expiresAt } = newPortalToken(block.check_out);

  const { error } = await supabase
    .from("bookings")
    .update({
      source: fields.source,
      // Already true on the block, and stays true: this booking has no
      // calendar sync of its own to rely on instead — it IS what's holding
      // the dates.
      blocks_calendar: true,
      guest_name: fields.guestName,
      phone: fields.phone,
      guests: fields.guests,
      nightly_rates: fields.nightlyRates,
      charges: fields.charges,
      total_amount: bookingTotal(fields.nightlyRates, fields.charges),
      notes: fields.notes || null,
      portal_token: token,
      token_expires_at: expiresAt,
    })
    .eq("id", blockId);

  if (error) return { error: error.message };

  if (fields.addonIds.length) {
    await copyAddonsToBooking(supabase, blockId, fields.addonIds);
  }

  revalidateBookingViews();
  redirect(`/admin/bookings/${blockId}`);
}
