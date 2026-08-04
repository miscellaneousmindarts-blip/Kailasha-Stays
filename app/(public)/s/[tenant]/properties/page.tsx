import type { Metadata } from "next";
import { Home } from "lucide-react";

import { PropertyCard } from "@/components/property-card";
import { listProperties } from "@/lib/queries";
import { getTenantBySlug, listActiveTenantSlugs, tenantBasePath } from "@/lib/tenant";
import { notFound } from "next/navigation";

export const revalidate = 300;

// Without this the [tenant] segment has no known values and this page drops
// from static+ISR to fully dynamic on every request.
export async function generateStaticParams() {
  const slugs = await listActiveTenantSlugs();
  return slugs.map((tenant) => ({ tenant }));
}

export const metadata: Metadata = {
  title: "Properties",
  description:
    "Browse our apartments and studios in Vrindavan. Book directly with the host — no booking fee.",
};

export default async function PropertiesPage(
  props: PageProps<"/s/[tenant]/properties">,
) {
  const { tenant: slug } = await props.params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const basePath = tenantBasePath(tenant.slug);
  const properties = await listProperties(tenant.id);

  return (
    <main className="container-page py-10 md:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl">Our places to stay</h1>
        <p className="text-text-muted mt-3 text-lg">
          A few apartments we look after ourselves in Vrindavan. Book directly
          with us, or on Airbnb if you prefer.
        </p>
      </header>

      {properties.length === 0 ? (
        <div className="border-border mt-10 flex flex-col items-center rounded-lg border border-dashed px-6 py-16 text-center">
          <Home className="text-text-muted size-8" aria-hidden="true" />
          <p className="mt-4 font-medium">No properties published yet</p>
          <p className="text-text-muted mt-1 max-w-sm text-sm">
            Listings will appear here as soon as they are published.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property, i) => (
            <li
              key={property.id}
              className="animate-[--animate-rise-in]"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <PropertyCard property={property} basePath={basePath} priority={i < 3} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
