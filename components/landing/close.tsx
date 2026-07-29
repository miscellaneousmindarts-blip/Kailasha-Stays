import { ArrowDown, MapPin } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { LandingPropertyCard } from "@/components/landing/property-card";
import { PhoneLink, ShareButton, WhatsAppLink } from "@/components/landing/actions";
import { landingConfig } from "@/lib/landing-config";
import type { LandingProperty } from "@/lib/landing";

/**
 * The person who reached the bottom is the highest-intent visitor on the
 * site, so the homes are repeated here rather than making them scroll back
 * up. These cards reuse the same image urls as the Homes section, so the
 * repeat costs no extra requests against the 16-image budget.
 */
export function Close({
  properties,
  whatsappHref,
  phone,
  address,
  shareSummary,
}: {
  properties: LandingProperty[];
  whatsappHref: string | null;
  phone: string | null;
  address: string | null;
  shareSummary: string;
}) {
  const { links } = landingConfig;

  return (
    <Section band="sand">
      <div className="text-center">
        <h2
          lang="hi"
          className="mt-3 text-[28px] leading-[1.35] font-semibold md:text-[38px]"
        >
          अपना घर चुनिए।
        </h2>
        <p className="text-text-muted mt-2 text-lg font-medium">
          Pick your home. We&apos;ll do the rest.
        </p>
        <p className="text-text-muted mx-auto mt-3 max-w-[560px]">
          Every home has its own page with full photos, exact price and a direct
          WhatsApp line to us.
        </p>

        <a
          href="#homes"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-6 inline-flex h-12 items-center gap-2 rounded-md px-7 font-medium"
        >
          See our homes
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        {properties.map((property) => (
          <LandingPropertyCard
            key={property.id}
            property={property}
            section="close"
            compact
          />
        ))}
      </div>

      <div className="border-border bg-surface mx-auto mt-10 max-w-[560px] rounded-lg border p-5 text-center">
        <p lang="hi" className="font-semibold">
          परिवार से पूछना है?
        </p>
        <p className="text-text-muted mt-1 text-sm">
          Send this page to your family group — they can see everything you just
          saw.
        </p>
        <div className="mt-4 flex justify-center">
          <ShareButton location="close" summary={shareSummary} variant="button" />
        </div>
      </div>

      <div className="text-text-muted mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        {whatsappHref ? (
          <WhatsAppLink href={whatsappHref} context="lp-close" variant="text">
            WhatsApp us
          </WhatsAppLink>
        ) : null}
        {phone ? <PhoneLink phone={phone} context="lp-close" /> : null}
        {address ? (
          links.mapsUrl ? (
            <a
              href={links.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pressable inline-flex min-h-11 items-center gap-2 underline-offset-2 hover:underline"
            >
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {address}
            </a>
          ) : (
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {address}
            </span>
          )
        ) : null}
      </div>
    </Section>
  );
}
