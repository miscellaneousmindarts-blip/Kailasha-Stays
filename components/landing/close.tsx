import { ArrowDown, MapPin } from "lucide-react";

import { Section } from "@/components/landing/primitives";
import { PropertyCarousel } from "@/components/landing/property-carousel";
import { PhoneLink, ShareButton, WhatsAppLink } from "@/components/landing/actions";
import type { LandingProperty } from "@/lib/landing";
import type { ResolvedClose } from "@/lib/homepage";

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
  mapsUrl,
  resolved,
  basePath,
}: {
  properties: LandingProperty[];
  whatsappHref: string | null;
  phone: string | null;
  address: string | null;
  shareSummary: string;
  mapsUrl: string | null;
  resolved: ResolvedClose;
  basePath: string;
}) {
  return (
    <Section band="sand">
      <div className="text-center">
        {resolved.headingHi ? (
          <h2
            lang="hi"
            className="mt-3 text-[28px] leading-[1.35] font-semibold md:text-[38px]"
          >
            {resolved.headingHi}
          </h2>
        ) : null}
        <p className="text-text-muted mt-2 text-lg font-medium">{resolved.heading}</p>
        {resolved.body ? (
          <p className="text-text-muted mx-auto mt-3 max-w-[560px]">{resolved.body}</p>
        ) : null}

        <a
          href="#homes"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-6 inline-flex h-12 items-center gap-2 rounded-md px-7 font-medium"
        >
          {resolved.ctaLabel}
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </div>

      <PropertyCarousel
        properties={properties}
        section="close"
        basePath={basePath}
        compact
        ariaLabel="Our homes"
        className="mx-auto mt-10 max-w-3xl"
      />

      {resolved.shareHeadingHi || resolved.shareBody ? (
        <div className="border-border bg-surface mx-auto mt-10 max-w-[560px] rounded-lg border p-5 text-center">
          {resolved.shareHeadingHi ? (
            <p lang="hi" className="font-semibold">
              {resolved.shareHeadingHi}
            </p>
          ) : null}
          {resolved.shareBody ? (
            <p className="text-text-muted mt-1 text-sm">{resolved.shareBody}</p>
          ) : null}
          <div className="mt-4 flex justify-center">
            <ShareButton location="close" summary={shareSummary} variant="button" />
          </div>
        </div>
      ) : null}

      <div className="text-text-muted mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        {whatsappHref ? (
          <WhatsAppLink href={whatsappHref} context="lp-close" variant="text">
            WhatsApp us
          </WhatsAppLink>
        ) : null}
        {phone ? <PhoneLink phone={phone} context="lp-close" /> : null}
        {address ? (
          mapsUrl ? (
            <a
              href={mapsUrl}
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
