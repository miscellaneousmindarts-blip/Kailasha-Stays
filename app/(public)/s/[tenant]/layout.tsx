import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteSettings } from "@/lib/settings";
import { getTenantBySlug, tenantBasePath } from "@/lib/tenant";

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
  if (!tenant) return {};

  const settings = await getSiteSettings(tenant.id);
  return {
    title: {
      default: settings.business_name,
      template: `%s | ${settings.business_name}`,
    },
  };
}

/**
 * Wraps every page of one tenant's public site.
 *
 * Resolving the tenant here rather than in each page means an unknown or
 * non-active slug 404s once, at the boundary, instead of every route having
 * to remember to check — which is what stops a suspended tenant's site from
 * quietly staying up because one page forgot.
 */
export default async function TenantLayout({
  children,
  params,
}: LayoutProps<"/s/[tenant]">) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const settings = await getSiteSettings(tenant.id);
  const basePath = tenantBasePath(tenant.slug);

  return (
    <>
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
    </>
  );
}
