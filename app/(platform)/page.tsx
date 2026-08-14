import { StickyBar } from "@/components/landing/sticky-bar";
import { SavingsCalculator } from "@/components/landing/savings-calculator";
import { PlatformHero } from "@/components/platform/platform-hero";
import { HomesGrid } from "@/components/platform/homes-grid";
import { LocationModule } from "@/components/platform/location-module";
import { ComparisonSection } from "@/components/platform/comparison-section";
import { WhatWeArrange } from "@/components/platform/what-we-arrange";
import { SocialProof } from "@/components/platform/social-proof";
import { HostBand } from "@/components/platform/host-band";
import { PlatformFaq } from "@/components/platform/platform-faq";
import { FinalCta } from "@/components/platform/final-cta";
import { Section } from "@/components/landing/primitives";
import { getPlatformProperties } from "@/lib/platform";
import { resolvePlatformHeroImage, resolvePlatformLogoSrc } from "@/lib/platform-assets";
import {
  PLATFORM_FAQ,
  PLATFORM_HOTEL_ROOM_RATE,
  PLATFORM_HOURS_END_HOUR,
  PLATFORM_HOURS_START,
  PLATFORM_HOURS_START_HOUR,
  PLATFORM_NAME,
  PLATFORM_NAP,
  PLATFORM_REPLY_MINUTES,
  PLATFORM_SITE_URL,
  platformWaLink,
} from "@/lib/platform-content";

// The rest of the site knows this pattern already (see s/[tenant]/page.tsx):
// live, cross-tenant property data has to reflect a newly added host the
// moment they're published, not on a stale cached render.
export const dynamic = "force-dynamic";

/**
 * The apex — deogharbnb.space's own homepage. Rebuilt per
 * docs/apex-page-plan.md from the "we build booking sites" B2B pitch into
 * the guest-facing marketplace across every host's published homes; the old
 * pitch is now §HostBand, one band near the bottom instead of the entire
 * page.
 */
export default async function PlatformLandingPage() {
  const properties = await getPlatformProperties();

  const logoSrc = resolvePlatformLogoSrc();
  const heroImageSrc = resolvePlatformHeroImage();

  // §S6a: the widest real walk-time across every published property, rounded
  // outward to a clean 5-minute bound — computed, not typed, so the promise
  // can never quietly become false as homes are added. Falls back to a
  // deliberately generous constant only if no property has a parsed one yet.
  const walkMinutesKnown = properties
    .map((p) => p.walkMinutes)
    .filter((m): m is number => m !== null);
  const widestWalkMinutes = walkMinutesKnown.length
    ? Math.ceil(Math.max(...walkMinutesKnown) / 5) * 5
    : null;

  const rateOptions = properties
    .filter((p): p is typeof p & { ratePerNight: number } => p.ratePerNight !== null)
    .map((p) => ({ rate: p.ratePerNight, sleeps: p.sleeps }));
  const currency = properties[0]?.currency ?? "INR";

  const shareSummary = `${PLATFORM_NAME} — verified whole-flat homestays in Deoghar, minutes from Baba Baidyanath Dham. Fixed prices in writing, free cancellation.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${PLATFORM_SITE_URL}/#organization`,
        name: PLATFORM_NAME,
        url: PLATFORM_SITE_URL,
        ...(logoSrc ? { logo: `${PLATFORM_SITE_URL}${logoSrc}` } : {}),
      },
      {
        "@type": "LocalBusiness",
        "@id": `${PLATFORM_SITE_URL}/#business`,
        name: PLATFORM_NAME,
        url: PLATFORM_SITE_URL,
        telephone: PLATFORM_NAP.phone,
        priceRange: "₹₹",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Deoghar",
          addressRegion: "Jharkhand",
          addressCountry: "IN",
        },
      },
      {
        "@type": "ItemList",
        itemListElement: properties.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          url: `${PLATFORM_SITE_URL}/stays/${p.publicSlug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: PLATFORM_FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: PLATFORM_SITE_URL },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Server-generated from our own data — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main>
        <PlatformHero imageSrc={heroImageSrc} />

        <HomesGrid properties={properties} />

        <Section band="sand">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="font-display text-[26px] leading-[1.15] font-semibold md:text-[34px]">
              Why one 2BHK beats three hotel rooms
            </h2>
            <p className="text-text-muted mx-auto mt-4 max-w-xl">
              Six people in a hotel means three rooms, three bills and three sets of
              keys. One 2BHK flat means you pay less and everyone stays together.
              Don&apos;t take our word for it — put your own numbers in.
            </p>
          </div>
          <SavingsCalculator
            options={rateOptions}
            currency={currency}
            shareSummary={shareSummary}
            hotelRoomRate={PLATFORM_HOTEL_ROOM_RATE}
          />
        </Section>

        <LocationModule widestWalkMinutes={widestWalkMinutes} />
        <ComparisonSection />
        <WhatWeArrange />
        <SocialProof />
        <HostBand />
        <PlatformFaq />
        <FinalCta properties={properties} shareSummary={shareSummary} />
      </main>

      <StickyBar
        whatsappHref={platformWaLink("apex-sticky")}
        phone={PLATFORM_NAP.phone}
        replyMinutes={PLATFORM_REPLY_MINUTES}
        hoursStart={PLATFORM_HOURS_START}
        hoursStartHour={PLATFORM_HOURS_START_HOUR}
        hoursEndHour={PLATFORM_HOURS_END_HOUR}
      />
    </>
  );
}
