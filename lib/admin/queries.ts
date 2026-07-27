import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AddonService,
  Booking,
  BookingAddon,
  BookingStatus,
  CalendarSource,
  Enquiry,
  EnquiryStatus,
  ExternalEvent,
  GuestDocument,
  Payment,
  Property,
  PropertyContact,
  PropertyImage,
  PropertyPrivate,
  PropertySection,
  SiteSettings,
} from "@/lib/types/database";

export type AdminPropertyRow = Pick<
  Property,
  | "id"
  | "slug"
  | "title"
  | "status"
  | "area"
  | "city"
  | "base_price"
  | "currency"
  | "sort_order"
  | "updated_at"
> & { property_images: Pick<PropertyImage, "storage_path" | "is_cover">[] };

/** Every property regardless of status — the admin listings table. */
export async function listAllProperties(): Promise<AdminPropertyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, slug, title, status, area, city, base_price, currency, sort_order, updated_at, property_images(storage_path, is_cover)",
    )
    .order("sort_order")
    .order("created_at");

  if (error) throw new Error(`Could not load properties: ${error.message}`);
  return (data ?? []) as AdminPropertyRow[];
}

export type PropertyForEdit = Property & {
  property_images: PropertyImage[];
  property_sections: PropertySection[];
  property_contacts: PropertyContact[];
  property_private: PropertyPrivate | null;
};

export async function getPropertyForEdit(
  id: string,
): Promise<PropertyForEdit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(
      "*, property_images(*), property_sections(*), property_contacts(*), property_private(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load property: ${error.message}`);
  if (!data) return null;

  const property = data as unknown as PropertyForEdit & {
    property_private: PropertyPrivate[] | PropertyPrivate | null;
  };

  property.property_images = [...(property.property_images ?? [])].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
  );
  property.property_sections = [...(property.property_sections ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  property.property_contacts = [...(property.property_contacts ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  property.property_private = Array.isArray(property.property_private)
    ? (property.property_private[0] ?? null)
    : (property.property_private ?? null);

  return property as PropertyForEdit;
}

/** Every add-on regardless of property scope — used to resolve enquiry.addon_ids by id. */
export async function listAllAddonServices(): Promise<AddonService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addon_services")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(`Could not load add-ons: ${error.message}`);
  return data ?? [];
}

/** Minimal property list for tab switchers / filter dropdowns. */
export type PropertyOption = Pick<Property, "id" | "title" | "slug">;

export async function listPropertyOptions(): Promise<PropertyOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, slug")
    .order("sort_order")
    .order("title");
  if (error) throw new Error(`Could not load properties: ${error.message}`);
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Enquiries
// -----------------------------------------------------------------------------

export type EnquiryRow = Enquiry & { properties: { title: string } | null };

export async function listEnquiries(
  status?: EnquiryStatus,
): Promise<EnquiryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("enquiries")
    .select("*, properties(title)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load enquiries: ${error.message}`);
  return (data ?? []) as unknown as EnquiryRow[];
}

export async function getEnquiry(id: string): Promise<EnquiryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select("*, properties(title)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load enquiry: ${error.message}`);
  return data as unknown as EnquiryRow | null;
}

export async function countNewEnquiries(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("enquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw new Error(`Could not count enquiries: ${error.message}`);
  return count ?? 0;
}

// -----------------------------------------------------------------------------
// Bookings
// -----------------------------------------------------------------------------

export type BookingRow = Booking & {
  properties: { title: string; slug: string } | null;
};

export async function listBookings(filter?: {
  propertyId?: string;
  status?: BookingStatus;
  when?: "upcoming" | "past";
}): Promise<BookingRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*, properties(title, slug)")
    .order("check_in", { ascending: filter?.when !== "past" });

  if (filter?.propertyId) query = query.eq("property_id", filter.propertyId);
  if (filter?.status) query = query.eq("status", filter.status);
  const today = new Date().toISOString().slice(0, 10);
  if (filter?.when === "upcoming") query = query.gte("check_out", today);
  if (filter?.when === "past") query = query.lt("check_out", today);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load bookings: ${error.message}`);
  return (data ?? []) as unknown as BookingRow[];
}

export type BookingForEdit = Booking & {
  properties: { title: string; slug: string; max_guests: number } | null;
  booking_addons: BookingAddon[];
  payments: Payment[];
  guest_documents: GuestDocument[];
};

export async function getBookingForEdit(
  id: string,
): Promise<BookingForEdit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, properties(title, slug, max_guests), booking_addons(*), payments(*), guest_documents(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load booking: ${error.message}`);
  if (!data) return null;

  const booking = data as unknown as BookingForEdit;
  booking.booking_addons = [...(booking.booking_addons ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  booking.payments = [...(booking.payments ?? [])].sort((a, b) =>
    a.paid_at.localeCompare(b.paid_at),
  );
  return booking;
}

export async function listAddonsForProperty(
  propertyId: string,
): Promise<AddonService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addon_services")
    .select("*")
    .eq("active", true)
    .or(`property_id.eq.${propertyId},property_id.is.null`)
    .order("sort_order");
  if (error) throw new Error(`Could not load add-ons: ${error.message}`);
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Calendar
// -----------------------------------------------------------------------------

export type CalendarBooking = Pick<
  Booking,
  "id" | "guest_name" | "check_in" | "check_out" | "source" | "status"
>;

export async function listCalendarBookings(
  propertyId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, guest_name, check_in, check_out, source, status")
    .eq("property_id", propertyId)
    .neq("status", "cancelled")
    .lt("check_in", rangeEnd)
    .gt("check_out", rangeStart);
  if (error) throw new Error(`Could not load bookings: ${error.message}`);
  return data ?? [];
}

export async function listCalendarExternalEvents(
  propertyId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<ExternalEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("external_events")
    .select("*")
    .eq("property_id", propertyId)
    .lt("start_date", rangeEnd)
    .gt("end_date", rangeStart);
  if (error) throw new Error(`Could not load synced events: ${error.message}`);
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

export type UpcomingStay = Pick<
  Booking,
  "id" | "guest_name" | "check_in" | "check_out" | "source"
> & { properties: { title: string } | null };

export async function listUpcomingStays(days = 7): Promise<UpcomingStay[]> {
  const supabase = await createClient();
  const today = new Date();
  const until = new Date(today.getTime() + days * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("bookings")
    .select("id, guest_name, check_in, check_out, source, properties(title)")
    .neq("status", "cancelled")
    .or(
      `and(check_in.gte.${iso(today)},check_in.lte.${iso(until)}),and(check_out.gte.${iso(today)},check_out.lte.${iso(until)})`,
    )
    .order("check_in");

  if (error) throw new Error(`Could not load upcoming stays: ${error.message}`);
  return (data ?? []) as unknown as UpcomingStay[];
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

export async function getSiteSettingsAdmin(): Promise<SiteSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  if (!data) throw new Error("site_settings row is missing.");
  return data;
}

export async function listAllCalendarSources(): Promise<CalendarSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_sources")
    .select("*")
    .order("created_at");
  if (error) throw new Error(`Could not load calendar sources: ${error.message}`);
  return data ?? [];
}
