import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteSettings } from "@/lib/settings";

/**
 * The guest portal keeps its own copy of the chrome the public site used to
 * share with it, because /stay/[token] deliberately stays unprefixed —
 * booking links are handed to guests directly and predate tenants, so they
 * must keep resolving without a tenant in the URL.
 *
 * KNOWN GAP, tracked to B5 (white-label): the branding here is the primary
 * tenant's, not the booking's. Correct while there is one tenant, wrong for
 * tenant #2's first guest. Fixing it needs the booking's tenant, which means
 * adding tenant_id to the get_booking_by_token bundle — that belongs with the
 * white-label work, where the logo and the rest of the brand fields land
 * together, rather than being half-done here.
 */
export default async function GuestPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <>
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
    </>
  );
}
