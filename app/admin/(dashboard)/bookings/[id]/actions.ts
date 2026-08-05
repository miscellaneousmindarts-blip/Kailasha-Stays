"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/admin/auth";
import type { AddonStatus, BookingStatus } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

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
  const totalAmount = Number(formData.get("total_amount"));
  const notes = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase
    .from("bookings")
    .update({
      guest_name: guestName || null,
      phone: phone || null,
      guests: Number.isFinite(guests) ? guests : null,
      total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
      notes: notes || null,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };
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
