import { PhoneLink, ShareButton, WhatsAppLink } from "@/components/landing/actions";
import { PropertyCard } from "@/components/property-card";
import { Section } from "@/components/landing/primitives";
import { PLATFORM_CONTACT_PHONE, platformWaLink } from "@/lib/platform-content";
import type { PlatformProperty } from "@/lib/platform";

/**
 * docs/apex-page-plan.md §S13. Repeats up to 3 of the already-fetched
 * properties (no refetch) rather than a bare "browse more" prompt — a
 * scrolled-to-the-bottom visitor is warm, and a couple of real homes right
 * there converts better than making them scroll back up.
 */
export function FinalCta({
  properties,
  shareSummary,
}: {
  properties: PlatformProperty[];
  shareSummary: string;
}) {
  const featured = properties.slice(0, 3);

  return (
    <Section band="sand">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[34px]">
          <span lang="hi" className="block">
            अपना घर चुनिए।
          </span>
          <span className="mt-1 block">Pick your home. We&apos;ll do the rest.</span>
        </h2>
        <p className="text-text-muted mx-auto mt-4 max-w-xl">
          Every home has its own page with full photos, the exact price, and a
          direct WhatsApp line to the family who runs it.
        </p>
      </div>

      {featured.length ? (
        <div
          className={`mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 ${
            featured.length < 3 ? "mx-auto max-w-4xl lg:grid-cols-2" : "lg:grid-cols-3"
          }`}
        >
          {featured.map((property) => (
            <PropertyCard
              key={property.id}
              property={{
                id: property.id,
                slug: property.slug,
                title: property.title,
                summary: null,
                area: null,
                city: null,
                max_guests: property.sleeps,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                base_price: property.ratePerNight,
                currency: property.currency,
                property_type: null,
                property_images: property.images,
              }}
              href={`/stays/${property.publicSlug}`}
              distance={property.distanceFromTemple?.value ?? null}
              hostName={property.hostName}
              airbnb={property.airbnb}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a
          href="#homes"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-12 items-center rounded-md px-6 font-medium"
        >
          See all stays
        </a>
        <WhatsAppLink href={platformWaLink("apex-final-cta")} context="apex-final-cta">
          WhatsApp us
        </WhatsAppLink>
        <PhoneLink phone={PLATFORM_CONTACT_PHONE} context="apex-final-cta" />
        <ShareButton location="final-cta" summary={shareSummary} variant="button" />
      </div>
    </Section>
  );
}
