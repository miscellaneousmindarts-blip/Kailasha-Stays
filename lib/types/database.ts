/**
 * Hand-maintained mirror of supabase/migrations/0001_init.sql.
 * If you change the schema, change this file in the same commit.
 */

export type PropertyStatus = "draft" | "published" | "archived";
export type SectionAudience = "public" | "guest" | "both";
export type EnquiryStatus = "new" | "contacted" | "converted" | "closed";
export type BookingSource =
  | "direct"
  | "airbnb"
  | "booking_com"
  | "other"
  | "blocked";
export type BookingStatus = "confirmed" | "cancelled" | "completed";
export type AddonStatus = "requested" | "confirmed" | "cancelled";
export type CalendarPlatform = "airbnb" | "booking_com" | "other";

export type SiteSettings = {
  /** Owning tenant, and the primary key — one row per tenant. */
  tenant_id: string;
  business_name: string;
  /** digits only, international format, e.g. "919876543210" */
  whatsapp_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  response_note: string | null;
  /** Fallback check-in/check-out time for any property that hasn't set its own (HH:MM). */
  default_check_in_time: string;
  default_check_out_time: string;
  /** Shown as commitments across the homepage — keep them true. */
  reply_minutes: number;
  hours_start: string;
  hours_end: string;
  /** Same window as hours_start/hours_end, in 24-hour numbers, for the sticky bar's "open now" comparison. */
  hours_start_hour: number;
  hours_end_hour: number;
  cancel_days: number;
  advance_pct: number;
  /** Indicative local hotel room rate, for the savings calculator's comparison. */
  hotel_room_rate: number;
  /** Setting this is what unhides the Meet-your-host section. */
  host_name: string | null;
  host_years: string | null;
  maps_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  /** homepage-media bucket path. Null falls back to business_name as text. */
  logo_path: string | null;
  /** homepage-media bucket path. Null falls back to the app default /favicon.ico. */
  favicon_path: string | null;
  /** Hex #rrggbb. Null keeps the default terracotta theme. */
  brand_color: string | null;
  /** Registered entity name, for the footer's fine print — shown nowhere else. */
  legal_name: string | null;
  footer_note: string | null;
  updated_at: string;
};

/**
 * What SiteHeader/SiteFooter actually render — a Pick rather than the full
 * SiteSettings, because the guest portal builds this straight from the
 * get_booking_by_token RPC's 'settings' object (the booking's own tenant),
 * which was never going to carry hotel_room_rate or cancel_days alongside
 * it. Every full SiteSettings object already satisfies this structurally, so
 * every existing caller keeps working unchanged.
 */
export type PublicSiteBranding = Pick<
  SiteSettings,
  | "business_name"
  | "whatsapp_number"
  | "logo_path"
  | "address"
  | "contact_phone"
  | "contact_email"
  | "footer_note"
  | "legal_name"
  | "brand_color"
>;

export type Property = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  slug: string;
  title: string;
  status: PropertyStatus;
  summary: string | null;
  description: string | null;
  property_type: string | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  base_price: number | null;
  /** @deprecated Superseded by booking_channels (0021). Column kept, no longer read. */
  airbnb_base_price: number | null;
  currency: string;
  amenities: string[];
  house_rules: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  address_line: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  gmaps_url: string | null;
  /** @deprecated Superseded by booking_channels (0021). Column kept, no longer read. */
  airbnb_url: string | null;
  /** @deprecated Superseded by booking_channels (0021). Column kept, no longer read. */
  booking_com_url: string | null;
  /** External URL to a room-service menu. Independent of room_service_pdf_path. */
  room_service_link: string | null;
  /** property-documents bucket path to an uploaded PDF menu. Independent of room_service_link. */
  room_service_pdf_path: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PropertyPrivate = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  property_id: string;
  exact_address: string | null;
  exact_gmaps_url: string | null;
  directions_note: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  door_code: string | null;
  other_notes: string | null;
};

export type PropertyContact = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  name: string;
  role: string | null;
  phone: string;
  show_to_guest: boolean;
  sort_order: number;
};

export type PropertyImage = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  storage_path: string;
  alt: string | null;
  /** Short guest-visible caption ("Bedroom", "Balcony") — shown on the photo itself, unlike alt. */
  tag: string | null;
  is_cover: boolean;
  sort_order: number;
  /** false for a photo uploaded from inside a block editor (e.g. a distances
   *  landmark) rather than the Photos tab — never in the guest gallery. */
  in_gallery: boolean;
};

export type PropertySection = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  title: string | null;
  type: string;
  content: unknown;
  audience: SectionAudience;
  visible: boolean;
  sort_order: number;
};

/**
 * One section of the homepage, in render order.
 *
 * `kind` distinguishes a section whose markup lives in components/landing/ —
 * validated against its own zod schema in lib/homepage-blocks.ts — from one
 * the admin composed from a layout template. Either way `content` is now the
 * WHOLE section, not a sparse override map: see docs/homepage-builder-v2-plan.md
 * §1 for why that changed.
 */
export type HomepageSection = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  key: string;
  kind: "builtin" | "custom";
  type: string;
  title: string | null;
  content: unknown;
  visible: boolean;
  /** Superseded by can_hide/pin below; kept only so old code paths don't error while unused. */
  locked: boolean;
  /** False only for `homes` — it is where the hero's primary button points. */
  can_hide: boolean;
  /** 'first' for hero, 'last' for close, else null. A pinned section can't be dragged out of its slot or past. */
  pin: "first" | "last" | null;
  sort_order: number;
  updated_at: string;
};

/**
 * One photo in the homepage media library. `storage_path` holds either a
 * homepage-media bucket path or a `/public` path — homepageImageUrl() in
 * lib/images.ts passes the latter straight through.
 */
export type HomepageImage = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  storage_path: string;
  /** For screen readers and search. Never rendered as visible text. */
  alt: string | null;
  /** The visible caption — what "nothing hidden" renders under each photo. */
  title: string | null;
  /** Drives the amber "Sample photo" badge. */
  is_placeholder: boolean;
  brief: string | null;
  created_at: string;
};

/** One shared catalog — which properties offer a given item lives in PropertyAddonService, not here. */
export type AddonService = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_unit: string | null;
  active: boolean;
  sort_order: number;
};

/** Presence of a row means the addon is offered on that property — no separate flag to fall out of sync. */
export type PropertyAddonService = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  property_id: string;
  addon_service_id: string;
};

export type Enquiry = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  name: string;
  phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  addon_ids: string[];
  message: string | null;
  status: EnquiryStatus;
  created_at: string;
};

export type Booking = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  enquiry_id: string | null;
  source: BookingSource;
  guest_name: string | null;
  phone: string | null;
  guests: number | null;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  /**
   * True (default): this row occupies its dates — checked by the
   * bookings_no_overlap exclusion constraint and exported to the iCal feed.
   * False: a record only, for a channel that already blocks the dates
   * itself (0022_booking_calendar_block_flag.sql).
   */
  blocks_calendar: boolean;
  total_amount: number;
  currency: string;
  portal_token: string | null;
  token_expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingAddon = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  booking_id: string;
  addon_service_id: string | null;
  name: string;
  price: number;
  qty: number;
  status: AddonStatus;
  created_at: string;
};

export type Payment = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  booking_id: string;
  amount: number;
  method: string | null;
  note: string | null;
  paid_at: string;
  created_at: string;
};

export type GuestDocument = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  booking_id: string;
  guest_name: string | null;
  doc_type: string;
  storage_path: string;
  uploaded_at: string;
};

export type ChannelPriceMode = "markup" | "fixed" | "none";

/**
 * One booking platform for one listing, as the guest sees it.
 *
 * Publicly readable, and therefore deliberately free of secrets — the iCal
 * feed URL for the same platform lives on calendar_sources, which only
 * admins can read. See 0021_booking_channels.sql.
 */
export type BookingChannel = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  name: string;
  /** Lowercase display hint for brand styling. Not authoritative. */
  slug: string | null;
  booking_url: string | null;
  price_mode: ChannelPriceMode;
  /** Percent above the direct nightly rate, when price_mode is 'markup'. */
  markup_pct: number | null;
  /** Flat nightly price, when price_mode is 'fixed'. */
  fixed_nightly: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CalendarSource = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  platform: CalendarPlatform;
  /** The booking channel this feed belongs to, when it has one (0021). */
  channel_id: string | null;
  ical_url: string;
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
};

export type ExternalEvent = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  source_id: string;
  uid: string;
  start_date: string;
  end_date: string;
  summary: string | null;
  synced_at: string;
};

/**
 * A date range with its own nightly rates, overriding the property defaults.
 * Half-open: end_date is the first night NOT covered.
 */
export type RatePeriod = {
  /** Owning tenant. Set by a database trigger from the parent row / caller. */
  tenant_id: string;
  id: string;
  property_id: string;
  label: string | null;
  start_date: string;
  end_date: string;
  direct_price: number;
  airbnb_price: number | null;
  created_at: string;
};

export type AdminUser = {
  user_id: string;
  email: string | null;
  /** Sits above all tenants: manages them and can act on their behalf. */
  is_superadmin: boolean;
  created_at: string;
};

export type TenantStatus =
  | "invited"
  | "awaiting_payment"
  | "active"
  | "suspended"
  | "cancelled";

export type Tenant = {
  id: string;
  /** Public URL segment: /s/{slug} today, {slug}.domain.com later. */
  slug: string;
  name: string;
  /** Reserved for the custom-domain phase. Null until then. */
  custom_domain: string | null;
  /**
   * The one hostname this tenant's site is canonical at. Null means it is
   * still served at NEXT_PUBLIC_SITE_URL under its /s/{slug} prefix — see
   * tenantOrigin() / tenantBasePath() in lib/tenant.ts.
   */
  canonical_host: string | null;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
};

export type TenantRole = "owner" | "staff";

/**
 * One superadmin support session against one tenant. Append-only by policy
 * (0017) — there is no delete path, and the only permitted update is stamping
 * ended_at on your own open row.
 */
export type ImpersonationLog = {
  id: string;
  actor_id: string;
  actor_email: string | null;
  tenant_id: string;
  tenant_slug: string;
  started_at: string;
  ended_at: string | null;
};

export type TenantMember = {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row,
  Rels extends readonly Relationship[] = [],
  Insert = Partial<Row>,
  Update = Partial<Row>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rels;
};

/**
 * PostgREST resolves embedded selects (`properties(*, property_images(*))`)
 * from this metadata, so each child table must declare its FK back to its
 * parent or the join comes back typed as an error.
 */
type BelongsToProperty<Name extends string> = [
  {
    foreignKeyName: Name;
    columns: ["property_id"];
    isOneToOne: false;
    referencedRelation: "properties";
    referencedColumns: ["id"];
  },
];

type BelongsToBooking<Name extends string> = [
  {
    foreignKeyName: Name;
    columns: ["booking_id"];
    isOneToOne: false;
    referencedRelation: "bookings";
    referencedColumns: ["id"];
  },
];

export type Database = {
  public: {
    Tables: {
      admin_users: Table<AdminUser>;
      tenants: Table<Tenant>;
      tenant_members: Table<
        TenantMember,
        [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ]
      >;
      impersonation_log: Table<
        ImpersonationLog,
        [
          {
            foreignKeyName: "impersonation_log_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ]
      >;
      site_settings: Table<SiteSettings>;
      properties: Table<Property>;
      property_private: Table<
        PropertyPrivate,
        [
          {
            foreignKeyName: "property_private_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: true;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ]
      >;
      property_contacts: Table<
        PropertyContact,
        BelongsToProperty<"property_contacts_property_id_fkey">
      >;
      property_images: Table<
        PropertyImage,
        BelongsToProperty<"property_images_property_id_fkey">
      >;
      property_sections: Table<
        PropertySection,
        BelongsToProperty<"property_sections_property_id_fkey">
      >;
      homepage_sections: Table<HomepageSection>;
      homepage_images: Table<HomepageImage>;
      addon_services: Table<AddonService>;
      property_addon_services: Table<
        PropertyAddonService,
        [
          {
            foreignKeyName: "property_addon_services_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_addon_services_addon_service_id_fkey";
            columns: ["addon_service_id"];
            isOneToOne: false;
            referencedRelation: "addon_services";
            referencedColumns: ["id"];
          },
        ]
      >;
      enquiries: Table<
        Enquiry,
        BelongsToProperty<"enquiries_property_id_fkey">
      >;
      bookings: Table<
        Booking,
        BelongsToProperty<"bookings_property_id_fkey">
      >;
      booking_addons: Table<
        BookingAddon,
        BelongsToBooking<"booking_addons_booking_id_fkey">
      >;
      payments: Table<Payment, BelongsToBooking<"payments_booking_id_fkey">>;
      guest_documents: Table<
        GuestDocument,
        BelongsToBooking<"guest_documents_booking_id_fkey">
      >;
      calendar_sources: Table<
        CalendarSource,
        BelongsToProperty<"calendar_sources_property_id_fkey">
      >;
      external_events: Table<
        ExternalEvent,
        BelongsToProperty<"external_events_property_id_fkey">
      >;
      rate_periods: Table<
        RatePeriod,
        BelongsToProperty<"rate_periods_property_id_fkey">
      >;
      booking_channels: Table<
        BookingChannel,
        BelongsToProperty<"booking_channels_property_fkey">
      >;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_superadmin: { Args: Record<string, never>; Returns: boolean };
      current_tenant_ids: { Args: Record<string, never>; Returns: string[] };
      get_unavailable_dates: {
        Args: { p_property_id: string };
        Returns: { start_date: string; end_date: string }[];
      };
      check_availability: {
        Args: { p_property_id: string; p_check_in: string; p_check_out: string };
        Returns: boolean;
      };
      create_enquiry: {
        Args: {
          p_property_id: string;
          p_name: string;
          p_phone: string;
          p_check_in: string;
          p_check_out: string;
          p_guests?: number;
          p_addon_ids?: string[];
          p_message?: string | null;
        };
        Returns: string;
      };
      get_booking_by_token: {
        Args: { p_token: string };
        Returns: unknown;
      };
      request_addon: {
        Args: { p_token: string; p_addon_id: string; p_qty?: number };
        Returns: string;
      };
      homepage_image_usage: {
        Args: { image_id: string };
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
