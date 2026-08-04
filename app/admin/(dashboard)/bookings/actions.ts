"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createDirectBooking } from "@/lib/admin/create-booking";

export type ActionResult = { error?: string; success?: boolean };

/**
 * For a guest who enquired off-platform — WhatsApp, phone, walk-in — and the
 * admin is entering what was already agreed. Creates the same confirmed
 * booking + guest-portal token as converting an enquiry (see
 * lib/admin/create-booking.ts), just without an enquiry row behind it.
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
  const totalAmount = Number(formData.get("total_amount") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();
  const addonIds = formData.getAll("addon_ids").map(String);

  if (!propertyId) return { error: "Choose a property." };
  if (!guestName) return { error: "Enter the guest's name." };
  if (!phone) {
    return {
      error:
        "Enter the guest's phone number — the confirmation link is shared over WhatsApp.",
    };
  }

  const supabase = await createClient();
  const result = await createDirectBooking(supabase, {
    propertyId,
    guestName,
    phone,
    guests,
    checkIn,
    checkOut,
    totalAmount,
    notes,
    addonIds,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  redirect(`/admin/bookings/${result.bookingId}`);
}
