import type { Metadata } from "next";

import { Hero, isHeroVariant, type HeroVariant } from "@/components/landing/hero";
import { TrustRibbon, DistanceChips } from "@/components/landing/trust-strip";
import { HomesSection } from "@/components/landing/homes-section";
import { WhyApartment } from "@/components/landing/why-apartment";
import { HonestPrice } from "@/components/landing/honest-price";
import { MeetHost } from "@/components/landing/meet-host";
import { NothingHidden } from "@/components/landing/nothing-hidden";
import { Proof } from "@/components/landing/proof";
import { ServicesStrip, ShravanStrip } from "@/components/landing/strips";
import { Faq } from "@/components/landing/faq";
import { Close } from "@/components/landing/close";
import { StickyBar } from "@/components/landing/sticky-bar";
import { getLandingData, lowestRate, waContext } from "@/lib/landing";
import { buildFaq } from "@/lib/landing-faq";
import { landingJsonLd } from "@/lib/landing-schema";
import { publicEnv } from "@/lib/env";

/**
 * Dynamic rather than statically generated: the hero swaps its H1 and lede on
 * `?src=` for ad message-match, and that decision has to happen on the server
 * — the H1 is above the fold, so swapping it on the client would either flash
 * the wrong copy or push the page's largest text past first paint.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // `absolute` so the root layout's "| Stays in Vrindavan" template doesn't
  // double-suffix a title that already names the business.
  title: {
    absolute: "Guest House Near Baidyanath Temple | Kailasha Stays Deoghar",
  },
  description:
    "Clean 2BHK serviced apartments for families in Deoghar, minutes from Baba Baidyanath Dham. Fixed prices, own kitchen, free cancellation, airport pickup and pooja arranged.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    // This page gets forwarded on WhatsApp — the OG card is what the family
    // group actually sees, so it's a first-class design surface, not an
    // afterthought.
    title: "Kailasha Stays — a full 2BHK for your family in Deoghar",
    description:
      "Minutes from Baba Baidyanath Dham. Own kitchen, fixed price, free cancellation.",
    type: "website",
    locale: "en_IN",
  },
};

export default async function Home(props: PageProps<"/">) {
  const params = await props.searchParams;
  const srcParam = Array.isArray(params.src) ? params.src[0] : params.src;
  const variant: HeroVariant = isHeroVariant(srcParam) ? srcParam : "brand";

  const { settings, properties, addons } = await getLandingData();
  const year = new Date().getFullYear();
  const rate = lowestRate(properties);
  const currency = properties[0]?.currency ?? "INR";

  const wa = settings.whatsapp_number;
  const href = (context: string, extra = "") =>
    wa ? waContext(wa, context, extra) : null;

  const shareSummary = `${settings.business_name} — a full 2BHK for your family in Deoghar, minutes from Baba Baidyanath Dham. Own kitchen, fixed price, free cancellation.`;

  const faq = buildFaq({ sleeps: properties[0]?.sleeps ?? null });

  const jsonLd = landingJsonLd({
    settings,
    properties,
    faq,
    siteUrl: publicEnv.siteUrl,
  });

  return (
    <>
      <script
        type="application/ld+json"
        // Server-generated from our own data — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main>
        <Hero
          variant={variant}
          whatsappHref={href("lp-hero")}
          phone={settings.contact_phone}
          shareSummary={shareSummary}
        />
        <TrustRibbon />
        <DistanceChips />

        <HomesSection
          properties={properties}
          waitlistHref={href(
            "waitlist",
            "Please add me to the list for new homes / Shravan.",
          )}
          year={year}
        />

        <WhyApartment
          options={properties
            .filter((p) => p.ratePerNight !== null)
            .map((p) => ({ rate: p.ratePerNight as number, sleeps: p.sleeps }))}
          currency={currency}
          shareSummary={shareSummary}
        />

        <HonestPrice ratePerNight={rate} currency={currency} addons={addons} />

        <MeetHost
          videoCallHref={href(
            "lp-videocall",
            "Can you show me the flat on a video call?",
          )}
          phone={settings.contact_phone}
        />

        <NothingHidden />
        <Proof />
        <ServicesStrip addons={addons} currency={currency} />
        <ShravanStrip year={year} />

        <Faq items={faq} whatsappHref={href("lp-faq")} />

        <Close
          properties={properties}
          whatsappHref={href("lp-close")}
          phone={settings.contact_phone}
          address={settings.address}
          shareSummary={shareSummary}
        />
      </main>

      {wa ? (
        <StickyBar
          whatsappHref={waContext(wa, "lp-sticky")}
          phone={settings.contact_phone}
        />
      ) : null}
    </>
  );
}
