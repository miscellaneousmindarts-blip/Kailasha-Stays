import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, ExternalLink, FileText, MapPin, ShieldCheck, UtensilsCrossed } from "lucide-react";

import { SectionList } from "@/components/blocks/section-renderer";
import { PropertyGallery } from "@/components/property-gallery";
import { BookingCard } from "@/components/booking/booking-card";
import { amenity } from "@/lib/amenities";
import { capacityLine } from "@/lib/format";
import { imageUrl, propertyDocumentUrl } from "@/lib/images";
import { pickCover } from "@/lib/media";
import { getAddonsForProperty, getProperty, listPublishedPropertyPaths } from "@/lib/queries";
import { getSiteSettings } from "@/lib/settings";
import { getTenantBySlug, tenantBasePath } from "@/lib/tenant";

export const revalidate = 300;

export async function generateStaticParams() {
  return listPublishedPropertyPaths();
}

export async function generateMetadata(
  props: PageProps<"/s/[tenant]/properties/[slug]">,
): Promise<Metadata> {
  const { tenant: tenantSlug, slug } = await props.params;
  const tenant = await getTenantBySlug(tenantSlug);
  const property = tenant ? await getProperty(tenant.id, slug) : null;
  if (!tenant || !property) return { title: "Property not found" };

  const cover = pickCover(property.property_images);
  const image = imageUrl(cover?.storage_path);
  const description =
    property.summary ??
    `${capacityLine(property)} in ${[property.area, property.city].filter(Boolean).join(", ")}.`;

  return {
    title: property.title,
    description,
    alternates: {
      canonical: `${tenantBasePath(tenant)}/properties/${property.slug}`,
    },
    openGraph: {
      title: property.title,
      description,
      type: "website",
      images: image ? [{ url: image, width: 1600, height: 1200 }] : undefined,
    },
  };
}

export default async function PropertyPage(
  props: PageProps<"/s/[tenant]/properties/[slug]">,
) {
  const { tenant: tenantSlug, slug } = await props.params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const property = await getProperty(tenant.id, slug);
  if (!property) notFound();

  const [addons, settings] = await Promise.all([
    getAddonsForProperty(property.id),
    getSiteSettings(tenant.id),
  ]);

  const location = [property.area, property.city, property.state]
    .filter(Boolean)
    .join(", ");
  const amenities = property.amenities
    .map((key) => ({ key, meta: amenity(key) }))
    .filter((a): a is { key: string; meta: NonNullable<typeof a.meta> } =>
      Boolean(a.meta),
    );

  const mapQuery = property.lat && property.lng
    ? `${property.lat},${property.lng}`
    : location;

  return (
    <main className="container-page py-6 pb-52 md:py-10 md:pb-52 lg:pb-10">
      <h1 className="mb-4 text-2xl md:text-3xl">{property.title}</h1>

      <PropertyGallery
        images={property.property_images}
        title={property.title}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-12">
        {/* content column */}
        <div className="min-w-0">
          <div className="border-border border-b pb-6">
            <p className="text-lg font-medium">
              {property.property_type} in {property.area ?? property.city}
            </p>
            <p className="text-text-muted mt-1">{capacityLine(property)}</p>
          </div>

          {property.description ? (
            <section className="border-border border-b py-8">
              <div className="max-w-prose space-y-4 text-[1.0625rem] leading-relaxed">
                {property.description.split(/\n\s*\n/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ) : null}

          {amenities.length ? (
            <section className="border-border border-b py-8">
              <h2 className="mb-4 text-xl md:text-[1.375rem]">
                What this place offers
              </h2>
              <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {amenities.map(({ key, meta }) => {
                  const Icon = meta.icon;
                  return (
                    <li key={key} className="flex items-center gap-3">
                      <Icon
                        className="text-text-muted size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{meta.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* admin-composed sections */}
          <SectionList sections={property.property_sections} />

          <section className="border-border border-t py-8">
            <h2 className="mb-4 text-xl md:text-[1.375rem]">Where you&apos;ll be</h2>
            <p className="text-text-muted flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {location}
            </p>
            <div className="bg-surface-subtle mt-4 overflow-hidden rounded-lg">
              <iframe
                title={`Map showing the area around ${property.title}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[16/10] w-full border-0"
              />
            </div>
            <p className="text-text-muted mt-3 text-sm">
              The exact address is shared after your booking is confirmed.
            </p>
          </section>

          <section className="border-border border-t py-8">
            <h2 className="mb-4 text-xl md:text-[1.375rem]">Things to know</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  <Clock className="size-4" aria-hidden="true" />
                  Check-in & check-out
                </p>
                <p className="text-text-muted mt-2 text-sm">
                  Check-in from{" "}
                  {property.check_in_time ?? settings.default_check_in_time},
                  check-out by{" "}
                  {property.check_out_time ?? settings.default_check_out_time}.
                </p>
              </div>
              {property.house_rules ? (
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    House rules
                  </p>
                  <p className="text-text-muted mt-2 text-sm">
                    {property.house_rules}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {property.room_service_link || property.room_service_pdf_path ? (
            <section className="border-border border-t py-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl md:text-[1.375rem]">
                <UtensilsCrossed className="text-text-muted size-5" aria-hidden="true" />
                Room service
              </h2>
              <div className="flex flex-wrap gap-3">
                {property.room_service_link ? (
                  <a
                    href={property.room_service_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border hover:bg-surface-subtle pressable flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium"
                  >
                    View menu
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
                {property.room_service_pdf_path ? (
                  <a
                    href={propertyDocumentUrl(property.room_service_pdf_path) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border hover:bg-surface-subtle pressable flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    Menu PDF
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        {/* booking column */}
        <aside className="lg:pt-2">
          <BookingCard
            propertyId={property.id}
            propertyTitle={property.title}
            maxGuests={property.max_guests}
            basePrice={property.base_price}
            airbnbBasePrice={property.airbnb_base_price}
            ratePeriods={property.rate_periods}
            currency={property.currency}
            airbnbUrl={property.airbnb_url}
            bookingComUrl={property.booking_com_url}
            whatsappNumber={settings.whatsapp_number}
            addons={addons}
          />
        </aside>
      </div>
    </main>
  );
}
