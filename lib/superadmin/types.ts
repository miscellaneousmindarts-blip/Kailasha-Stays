import type { Tenant, TenantStatus } from "@/lib/types/database";

/**
 * Shapes and constants shared between the superadmin server queries and the
 * client components that render them.
 *
 * Split out of queries.ts because that module is `server-only` — importing a
 * type from it into a client component drags the Supabase server client into
 * the browser bundle and fails the build. Types are erased at compile time,
 * but TENANT_STATUSES is a real runtime value, so it genuinely has to live
 * somewhere neutral.
 */

export type TenantRow = Tenant & {
  owners: string[];
  propertyCount: number;
  bookingCount: number;
};

export type ImpersonationEntry = {
  id: string;
  actor_email: string | null;
  tenant_slug: string;
  started_at: string;
  ended_at: string | null;
};

export const TENANT_STATUSES: TenantStatus[] = [
  "invited",
  "awaiting_payment",
  "active",
  "suspended",
  "cancelled",
];
