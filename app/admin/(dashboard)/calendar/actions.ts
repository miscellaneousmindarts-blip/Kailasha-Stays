"use server";

import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/admin/auth";
import {
  listCalendarBookings,
  listCalendarExternalEvents,
  type CalendarBooking,
} from "@/lib/admin/queries";
import type { ExternalEvent } from "@/lib/types/database";

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

  const { supabase } = await requireTenant();
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
  const { supabase } = await requireTenant();
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .eq("source", "blocked");
  if (error) return { error: error.message };

  revalidatePath("/admin/calendar");
  return { success: true };
}
