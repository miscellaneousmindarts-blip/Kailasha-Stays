/**
 * Central place for environment access.
 *
 * Anything read here that is NOT prefixed with NEXT_PUBLIC_ must only ever be
 * imported from server-side code. `serverEnv` is guarded so an accidental
 * client import fails loudly at build time instead of leaking a secret.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  ownerWhatsapp: process.env.NEXT_PUBLIC_OWNER_WHATSAPP ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const serverEnv = {
  get serviceRoleKey() {
    if (typeof window !== "undefined") {
      throw new Error("serverEnv.serviceRoleKey must never be read on the client");
    }
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
  get icalExportSecret() {
    if (typeof window !== "undefined") {
      throw new Error("serverEnv.icalExportSecret must never be read on the client");
    }
    return required("ICAL_EXPORT_SECRET", process.env.ICAL_EXPORT_SECRET);
  },
};
