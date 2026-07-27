"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  listCalendarBookings,
  listCalendarExternalEvents,
  type CalendarBooking,
} from "@/lib/admin/queries";
import type { ExternalEvent } from "@/lib/types/database";

export type ActionResult = { error?: string; success?: boolean };

/** Read action, callable directly from the client calendar as the month changes. */
export async function getMonthEvents(
  propertyId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<{ bookings: CalendarBooking[]; external: ExternalEvent[] }> {
  const [bookings, external] = await Promise.all([
    listCalendarBookings(propertyId, rangeStart, rangeEnd),
    listCalendarExternalEvents(propertyId, rangeStart, rangeEnd),
  ]);
  return { bookings, external };
}

export async function addManualBlock(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult> {
  const checkIn = String(formData.get("check_in") ?? "");
  const checkOut = String(formData.get("check_out") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!(checkOut > checkIn)) {
    return { error: "Check-out must be after check-in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert({
    property_id: propertyId,
    source: "blocked",
    check_in: checkIn,
    check_out: checkOut,
    status: "confirmed",
    notes: notes || null,
  });

  if (error) {
    if (error.code === "23P01") {
      return {
        error: "Those dates overlap with an existing booking for this property.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/calendar");
  return { success: true };
}

export async function removeManualBlock(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("source", "blocked");
  if (error) return { error: error.message };

  revalidatePath("/admin/calendar");
  return { success: true };
}
