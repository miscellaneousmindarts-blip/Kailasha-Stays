"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/admin/auth";
import { parseBookingPricingInput } from "@/lib/admin/booking-pricing-input";
import { bookingTotal } from "@/lib/pricing";
import type { AddonStatus, Booking, BookingStatus } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/** yyyy-MM-dd, as every date input and every date column here uses. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ── Tenant scoping in this file ──────────────────────────────────────────
 *
 * Mutations here act on rows that hang off a parent (a property, a booking),
 * and they are reached by a unique id or by their parent's id. They rely on
 * RLS plus the composite foreign keys from 0012, which together make a
 * cross-tenant write structurally impossible: the policy refuses any row
 * outside current_tenant_ids(), and a child physically cannot carry a
 * tenant_id different from its parent's.
 *
 * What does NOT rely on RLS alone, and is filtered by tenant.id explicitly:
 * writes to top-level rows (properties, addon_services, homepage_sections,
 * homepage_images, site_settings), and any read or write that is not keyed by
 * a unique id — because for a SUPERADMIN, RLS resolves to every tenant, so an
 * unfiltered query would span all of them at once.
 */


function revalidateBooking(bookingId: string) {
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
}

/** Short-lived signed URL for viewing a guest's uploaded ID — never a
 *  public/permanent link, and only reachable by an authenticated admin
 *  (storage RLS on guest-docs already requires is_admin() to read). */
export async function getDocumentSignedUrl(
  storagePath: string,
): Promise<ActionResult & { url?: string }> {
  const { supabase } = await requireTenant();
  const { data, error } = await supabase.storage
    .from("guest-docs")
    .createSignedUrl(storagePath, 60);
  if (error || !data) return { error: "Could not open that document." };
  return { success: true, url: data.signedUrl };
}

export async function updateBookingDetails(
  bookingId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireTenant();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const guests = Number(formData.get("guests"));
  const notes = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase
    .from("bookings")
    .update({
      guest_name: guestName || null,
      phone: phone || null,
      guests: Number.isFinite(guests) ? guests : null,
      notes: notes || null,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidateBooking(bookingId);
  return { success: true };
}

/**
 * Rebuilds a booking's dates AND price from one form — the only place
 * check_in/check_out/total_amount change after creation, mirroring how
 * they're derived at creation time in lib/admin/create-booking.ts.
 *
 * Dates and pricing move together deliberately. The nightly breakdown is one
 * row per night, so a date change that didn't rebuild it would leave a total
 * describing nights the guest is no longer staying. Editing them in one form
 * means parseBookingPricingInput()'s length check (rows must equal nights)
 * validates the pair against each other on every save.
 *
 * Nothing here writes to a calendar: availability is DERIVED from this row
 * (the bookings_no_overlap exclusion constraint, and the iCal export's
 * blocks_calendar filter both read it live), so moving the dates frees the
 * old ones and holds the new ones as a single consequence of the update.
 */
export async function updateBookingDatesAndPricing(
  bookingId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireTenant();

  const { data: booking } = await supabase
    .from("bookings")
    .select("property_id, check_in, check_out, status, blocks_calendar, portal_token")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found." };

  const checkIn = String(formData.get("check_in") ?? "").trim();
  const checkOut = String(formData.get("check_out") ?? "").trim();
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) {
    return { error: "Enter both dates." };
  }
  if (!(checkOut > checkIn)) {
    return { error: "Check-out must be after check-in." };
  }

  const pricing = parseBookingPricingInput(formData, checkIn, checkOut);
  if (!pricing.ok) return { error: pricing.error };

  const datesChanged = checkIn !== booking.check_in || checkOut !== booking.check_out;

  /**
   * The exclusion constraint below catches an overlap with another BOOKING,
   * but it knows nothing about external_events — the dates synced in from
   * Airbnb/Booking.com iCal feeds. Without this check an admin could move a
   * direct booking onto nights a channel has already sold, and nothing would
   * complain until two families arrived.
   *
   * Skipped when this booking doesn't itself hold the dates
   * (blocks_calendar = false): such a row exists precisely BECAUSE a channel
   * is blocking those dates — it's a record of that same reservation, so its
   * own external event would always "conflict" with it.
   */
  if (datesChanged && booking.blocks_calendar && booking.status !== "cancelled") {
    const { data: clashes, error: clashError } = await supabase
      .from("external_events")
      .select("summary, start_date, end_date")
      .eq("property_id", booking.property_id)
      .lt("start_date", checkOut)
      .gt("end_date", checkIn)
      .limit(1);

    if (clashError) return { error: clashError.message };
    if (clashes?.length) {
      const clash = clashes[0];
      return {
        error: `Those dates are already blocked by a synced calendar (${
          clash.summary?.trim() || "external booking"
        }, ${clash.start_date} → ${clash.end_date}). Free them there first, or pick different dates.`,
      };
    }
  }

  const update: Partial<Booking> = {
    check_in: checkIn,
    check_out: checkOut,
    nightly_rates: pricing.nightlyRates,
    charges: pricing.charges,
    total_amount: bookingTotal(pricing.nightlyRates, pricing.charges),
  };

  /**
   * The portal link dies 7 days after checkout (get_booking_by_token gates on
   * token_expires_at). Moving checkout later without moving that too would
   * black out the guest's own link partway through a stay they're still on —
   * so recompute it from the new checkout, keeping the SAME token so the link
   * already sent over WhatsApp keeps working.
   */
  if (datesChanged && booking.portal_token) {
    const expires = new Date(checkOut);
    expires.setDate(expires.getDate() + 7);
    update.token_expires_at = expires.toISOString();
  }

  const { error } = await supabase.from("bookings").update(update).eq("id", bookingId);

  if (error) {
    // 23P01 = bookings_no_overlap: these dates now collide with another
    // confirmed/completed booking that occupies them. Same wording as
    // createDirectBooking's, since it's the same constraint and the same
    // thing went wrong.
    if (error.code === "23P01") {
      return { error: "Those dates overlap with an existing booking for this property." };
    }
    return { error: error.message };
  }

  revalidateBooking(bookingId);
  return { success: true };
}

export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<ActionResult> {
  const { supabase } = await requireTenant();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  revalidateBooking(bookingId);
  return { success: true };
}

export async function regeneratePortalToken(
  bookingId: string,
): Promise<ActionResult & { token?: string }> {
  const { supabase } = await requireTenant();
  const { data: booking } = await supabase
    .from("bookings")
    .select("check_out")
    .eq("id", bookingId)
    .single();
  if (!booking) return { error: "Booking not found." };

  const token = nanoid(12);
  const expires = new Date(booking.check_out);
  expires.setDate(expires.getDate() + 7);

  const { error } = await supabase
    .from("bookings")
    .update({ portal_token: token, token_expires_at: expires.toISOString() })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true, token };
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

export async function addBookingAddon(
  bookingId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  const qty = Number(formData.get("qty")) || 1;
  if (!name) return { error: "Enter a name for the add-on." };

  const { supabase } = await requireTenant();
  const { error } = await supabase.from("booking_addons").insert({
    booking_id: bookingId,
    name,
    price: Number.isFinite(price) ? price : 0,
    qty,
    status: "confirmed",
  });
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true };
}

/**
 * Edits one add-on's name, price and quantity ON THIS BOOKING ONLY.
 *
 * booking_addons.price/qty are already per-booking columns — copied from the
 * catalogue at creation (copyAddonsToBooking) and never read back from it —
 * so this changes what this guest is charged without touching
 * addon_services, exactly like the nightly rates in BookingPriceEditor
 * override the property's own pricing for one stay.
 *
 * The bounds mirror the table's own check constraints (price >= 0, qty
 * between 1 and 99) so a bad value gets a sentence instead of a raw
 * constraint violation.
 */
export async function updateBookingAddon(
  bookingId: string,
  addonRowId: string,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  const qty = Number(formData.get("qty"));

  if (!name) return { error: "Enter a name for the add-on." };
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Enter a price of zero or more." };
  }
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
    return { error: "Quantity has to be a whole number between 1 and 99." };
  }

  const { supabase } = await requireTenant();
  const { error } = await supabase
    .from("booking_addons")
    .update({ name, price, qty })
    .eq("id", addonRowId);
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true };
}

export async function setBookingAddonStatus(
  bookingId: string,
  addonRowId: string,
  status: AddonStatus,
): Promise<ActionResult> {
  const { supabase } = await requireTenant();
  const { error } = await supabase
    .from("booking_addons")
    .update({ status })
    .eq("id", addonRowId);
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true };
}

export async function deleteBookingAddon(
  bookingId: string,
  addonRowId: string,
): Promise<ActionResult> {
  const { supabase } = await requireTenant();
  const { error } = await supabase
    .from("booking_addons")
    .delete()
    .eq("id", addonRowId);
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function addPayment(
  bookingId: string,
  formData: FormData,
): Promise<ActionResult> {
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid payment amount." };
  }
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const paidAt = String(formData.get("paid_at") ?? "").trim();

  const { supabase } = await requireTenant();
  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    amount,
    method: method || null,
    note: note || null,
    paid_at: paidAt || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true };
}

export async function deletePayment(
  bookingId: string,
  paymentId: string,
): Promise<ActionResult> {
  const { supabase } = await requireTenant();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };

  revalidateBooking(bookingId);
  return { success: true };
}
