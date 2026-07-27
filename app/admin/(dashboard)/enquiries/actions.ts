"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { EnquiryStatus } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

export async function setEnquiryStatus(
  enquiryId: string,
  status: EnquiryStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("enquiries")
    .update({ status })
    .eq("id", enquiryId);
  if (error) return { error: error.message };

  revalidatePath("/admin/enquiries");
  return { success: true };
}

/**
 * Converts an enquiry into a confirmed direct booking: creates the booking
 * (with a fresh guest-portal token), copies the enquiry's requested add-ons
 * across as `requested` booking_addons, and marks the enquiry converted.
 *
 * Relies on the bookings_no_overlap exclusion constraint as the final word on
 * double-booking — if two admins convert overlapping enquiries at once, the
 * database rejects the second insert rather than silently double-booking.
 */
export async function convertEnquiryToBooking(
  enquiryId: string,
  formData: FormData,
): Promise<ActionResult & { bookingId?: string }> {
  const supabase = await createClient();

  const { data: enquiry, error: enquiryError } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", enquiryId)
    .single();
  if (enquiryError || !enquiry) return { error: "Enquiry not found." };

  const checkIn = String(formData.get("check_in") ?? enquiry.check_in);
  const checkOut = String(formData.get("check_out") ?? enquiry.check_out);
  const guests = Number(formData.get("guests") ?? enquiry.guests);
  const totalAmount = Number(formData.get("total_amount") ?? 0);

  if (!(checkOut > checkIn)) {
    return { error: "Check-out must be after check-in." };
  }

  const token = nanoid(12);
  const tokenExpires = new Date(checkOut);
  tokenExpires.setDate(tokenExpires.getDate() + 7);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      property_id: enquiry.property_id,
      enquiry_id: enquiry.id,
      source: "direct",
      guest_name: enquiry.name,
      phone: enquiry.phone,
      guests,
      check_in: checkIn,
      check_out: checkOut,
      status: "confirmed",
      total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
      portal_token: token,
      token_expires_at: tokenExpires.toISOString(),
    })
    .select("id")
    .single();

  if (bookingError) {
    if (bookingError.code === "23P01") {
      return {
        error:
          "Those dates overlap with an existing booking for this property.",
      };
    }
    return { error: bookingError.message };
  }

  if (enquiry.addon_ids?.length) {
    const { data: addons } = await supabase
      .from("addon_services")
      .select("id, name, price")
      .in("id", enquiry.addon_ids);

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

  await supabase
    .from("enquiries")
    .update({ status: "converted" })
    .eq("id", enquiryId);

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  redirect(`/admin/bookings/${booking.id}`);
}
