import "server-only";

import { cookies } from "next/headers";

/**
 * Which tenant a superadmin is currently acting as.
 *
 * ── Why this cookie is NOT signed ────────────────────────────────────────
 *
 * It looks like the kind of value that should be signed, and it isn't,
 * deliberately — the cookie carries no authority. It names a tenant; it does
 * not assert that the bearer may act on it.
 *
 * requireTenant() re-derives that permission from the database on every
 * single request: it reads admin_users.is_superadmin for the *session's own
 * user* and ignores this cookie entirely unless that flag is true. So forging
 * the cookie gains a non-superadmin exactly nothing — they are not a
 * superadmin, so the branch that reads it never executes. Signing would
 * protect the integrity of a value whose integrity doesn't grant anything.
 *
 * What DOES matter here is httpOnly (so an XSS can't quietly switch which
 * customer an admin is editing), sameSite (so a cross-site request can't set
 * it), and re-validating the tenant still exists on every read.
 *
 * If this cookie ever starts carrying a claim rather than a selector — a role,
 * an expiry the server doesn't independently check — it must be signed. It
 * doesn't today.
 */
const COOKIE_NAME = "acting_tenant";

/** Long enough for a support session, short enough not to linger for days. */
const MAX_AGE_SECONDS = 60 * 60 * 8;

export async function readActingTenantId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/** Server Actions / Route Handlers only — HTTP can't set cookies mid-stream. */
export async function setActingTenantId(tenantId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearActingTenantId(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
