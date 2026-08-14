import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brandColorStyle } from "@/lib/brand-color";
import { getBookingBundle } from "@/lib/guest-portal";
import { getSiteSettings } from "@/lib/settings";
import { withPlatformPortalBranding } from "@/lib/platform-content";
import type { PublicSiteBranding } from "@/lib/types/database";

/**
 * The guest portal keeps its own copy of the chrome the public site shares
 * with it, because /stay/[token] deliberately stays unprefixed — booking
 * links are handed to guests directly and predate tenants, so they must keep
 * resolving without a tenant in the URL.
 *
 * The branding shown IS the booking's own tenant, not the primary one:
 * get_booking_by_token (0016) already scopes its 'settings' object to
 * v_booking.tenant_id, so once the token resolves, the header/footer/brand
 * color read from there. getBookingBundle is called again here even though
 * the page also calls it — React's cache() wrapper (lib/guest-portal.ts)
 * de-duplicates that into one RPC round trip per request.
 *
 * Only for a token that DOESN'T resolve is there no tenant to be the booking
 *'s — that genuinely can't be known from an invalid link, so it falls back
 * to the primary tenant, same as before this phase.
 *
 * A 'listing' (Plan A) tenant's booking gets Deoghar BnB's own visual
 * identity instead of theirs (0027, 0028, docs/tenant-plans-plan.md §6) —
 * they have no site or branding anywhere else, so showing their
 * business_name/logo here would name a business that doesn't otherwise
 * exist. withPlatformPortalBranding() only swaps the visual fields; the
 * WhatsApp number and phone/email stay the tenant's own real ones, since
 * those are how the guest actually reaches the host servicing their stay.
 */
export default async function GuestPortalLayout({
  children,
  params,
}: LayoutProps<"/stay/[token]">) {
  const { token } = await params;
  const bundle = await getBookingBundle(token);

  const rawSettings: PublicSiteBranding = bundle?.settings ?? (await getSiteSettings());
  const settings =
    bundle?.tenant_plan === "listing" ? withPlatformPortalBranding(rawSettings) : rawSettings;

  return (
    <div style={brandColorStyle(settings.brand_color)} className="contents">
      <a
        href="#main"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader settings={settings} basePath="" />
      <div id="main" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter settings={settings} basePath="" />
    </div>
  );
}
