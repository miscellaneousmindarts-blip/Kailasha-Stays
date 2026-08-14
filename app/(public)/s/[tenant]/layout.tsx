import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brandColorStyle } from "@/lib/brand-color";
import { homepageImageUrl } from "@/lib/images";
import { getSiteSettings } from "@/lib/settings";
import { getTenantBySlug, tenantBasePath, tenantOrigin } from "@/lib/tenant";

/**
 * Overrides the root layout's hardcoded "%s | Stays in Vrindavan" title
 * template for everything under this tenant.
 *
 * Without this, every page of every tenant's site would carry the original
 * business's name in its tab title and search results — the most visible
 * white-label leak there is, and one that only appears once there are two
 * tenants, which is exactly when nobody is looking for it.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/s/[tenant]">): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  // A 'listing' tenant has no site here at all — see the identical check
  // and comment on the layout component below.
  if (!tenant || tenant.plan === "listing") return {};

  const settings = await getSiteSettings(tenant.id);
  const faviconUrl = homepageImageUrl(settings.favicon_path);

  return {
    // Every relative canonical and OG URL under this tenant resolves against
    // this. Without it Next falls back to the deployment URL, which is how
    // deogharbnb.space ended up serving canonical tags naming
    // kailasha-stays.vercel.app — telling Google the new domain was a
    // duplicate of the old one.
    metadataBase: new URL(tenantOrigin(tenant)),
    title: {
      default: settings.business_name,
      template: `%s | ${settings.business_name}`,
    },
    // Omitted entirely when unset, rather than pointed at a fallback URL —
    // that leaves Next's file-based /app/favicon.ico convention in charge,
    // which is exactly the right default for a tenant with no favicon of
    // their own.
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

/**
 * Wraps every page of one tenant's public site.
 *
 * Resolving the tenant here rather than in each page means an unknown or
 * non-active slug 404s once, at the boundary, instead of every route having
 * to remember to check — which is what stops a suspended tenant's site from
 * quietly staying up because one page forgot.
 *
 * A 'listing' (Plan A) tenant 404s here too, same as an unknown slug —
 * they have admin access but no site of their own to serve (0027,
 * docs/tenant-plans-plan.md). Their properties still exist and are still
 * bookable, just at /stays/{public_slug} on the apex, never here.
 */
export default async function TenantLayout({
  children,
  params,
}: LayoutProps<"/s/[tenant]">) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.plan === "listing") notFound();

  const settings = await getSiteSettings(tenant.id);
  const basePath = tenantBasePath(tenant);

  return (
    // `contents` keeps this div out of the box tree entirely (no layout
    // effect — body's own flex column still applies directly to the header/
    // main/footer below), while still giving the brand-color CSS custom
    // properties a scope to cascade from into every descendant that reads
    // them, including the skip link right below.
    <div style={brandColorStyle(settings.brand_color)} className="contents">
      <a
        href="#main"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader settings={settings} basePath={basePath} />
      <div id="main" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter settings={settings} basePath={basePath} />
    </div>
  );
}
