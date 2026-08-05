/** Mirrors the jsonb shape returned by the get_booking_by_token RPC (see
 *  supabase/migrations/0001_init.sql) — hand-maintained the same way as
 *  lib/types/database.ts. */

export type GuestBookingBundle = {
  booking: {
    id: string;
    guest_name: string | null;
    phone: string | null;
    guests: number | null;
    check_in: string;
    check_out: string;
    nights: number;
    status: string;
    currency: string;
  };
  property: {
    id: string;
    slug: string;
    title: string;
    area: string | null;
    city: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    house_rules: string | null;
    max_guests: number;
    images: { storage_path: string; alt: string | null }[];
  } | null;
  private: {
    exact_address: string | null;
    exact_gmaps_url: string | null;
    directions_note: string | null;
    wifi_name: string | null;
    wifi_password: string | null;
    door_code: string | null;
    other_notes: string | null;
  } | null;
  contacts: { name: string; role: string | null; phone: string }[];
  sections: {
    id: string;
    title: string | null;
    type: string;
    content: unknown;
  }[];
  addons_available: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    price_unit: string | null;
  }[];
  addons_booked: {
    id: string;
    name: string;
    price: number;
    qty: number;
    status: string;
  }[];
  billing: {
    base: number;
    addons_total: number;
    total: number;
    paid: number;
    due: number;
    payments: { amount: number; method: string | null; paid_at: string }[];
  };
  documents: { guest_name: string | null; doc_type: string; uploaded_at: string }[];
  settings: {
    business_name: string;
    whatsapp_number: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    response_note: string | null;
    address: string | null;
    logo_path: string | null;
    favicon_path: string | null;
    brand_color: string | null;
    legal_name: string | null;
    footer_note: string | null;
  } | null;
};
