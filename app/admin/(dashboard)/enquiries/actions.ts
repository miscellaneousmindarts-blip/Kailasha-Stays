"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/admin/auth";
import { createDirectBooking } from "@/lib/admin/create-booking";
import type { EnquiryStatus } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

export async function setEnquiryStatus(
  enquiryId: string,
  status: EnquiryStatus,
): Promise<ActionResult> {
  const { supabase, tenant } = await requireTenant();
  const { error } = await supabase
    .from("enquiries")
    .update({ status })
    .eq("tenant_id", tenant.id)
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
  const { supabase, tenant } = await requireTenant();

  const { data: enquiry, error: enquiryError } = await supabase
    .from("enquiries")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("id", enquiryId)
    .single();
  if (enquiryError || !enquiry) return { error: "Enquiry not found." };

  const checkIn = String(formData.get("check_in") ?? enquiry.check_in);
  const checkOut = String(formData.get("check_out") ?? enquiry.check_out);
  const guests = Number(formData.get("guests") ?? enquiry.guests);
  const totalAmount = Number(formData.get("total_amount") ?? 0);

  const result = await createDirectBooking(supabase, {
    propertyId: enquiry.property_id,
    enquiryId: enquiry.id,
    guestName: enquiry.name,
    phone: enquiry.phone,
    guests,
    checkIn,
    checkOut,
    totalAmount,
    addonIds: enquiry.addon_ids ?? [],
  });
  if (result.error) return { error: result.error };

  await supabase
    .from("enquiries")
    .update({ status: "converted" })
    .eq("id", enquiryId);

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  redirect(`/admin/bookings/${result.bookingId}`);
}
