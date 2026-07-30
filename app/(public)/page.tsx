import type { Metadata } from "next";

import { Hero, isHeroVariant, type HeroVariant } from "@/components/landing/hero";
import { TrustRibbon } from "@/components/landing/trust-strip";
import { MapStrip } from "@/components/landing/map-strip";
import { HomesSection } from "@/components/landing/homes-section";
import { WhyApartment } from "@/components/landing/why-apartment";
import { MeetHost } from "@/components/landing/meet-host";
import { NothingHidden } from "@/components/landing/nothing-hidden";
import { Proof } from "@/components/landing/proof";
import { ServicesStrip, ShravanStrip } from "@/components/landing/strips";
import { Faq } from "@/components/landing/faq";
import { Close } from "@/components/landing/close";
import { StickyBar } from "@/components/landing/sticky-bar";
import { getLandingData, templeDistance, travelTime, waContext } from "@/lib/landing";
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
    "Clean serviced apartments for families in Deoghar, minutes from Baba Baidyanath Dham. The whole flat is yours. Fixed prices, free cancellation, airport pickup and pooja arranged.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    // This page gets forwarded on WhatsApp — the OG card is what the family
    // group actually sees, so it's a first-class design surface, not an
    // afterthought.
    title: "Kailasha Stays — a home of your own in Deoghar",
    description:
      "Minutes from Baba Baidyanath Dham. The whole flat is yours, at a fixed price, with free cancellation.",
    type: "website",
    locale: "en_IN",
  },
};

export default async function Home(props: PageProps<"/">) {
  const params = await props.searchParams;
  const srcParam = Array.isArray(params.src) ? params.src[0] : params.src;
  const variant: HeroVariant = isHeroVariant(srcParam) ? srcParam : "brand";

  const { settings, properties, addons, primary } = await getLandingData();
  const year = new Date().getFullYear();
  const currency = properties[0]?.currency ?? "INR";
  // The hero's travel time and the FAQ's distance answer come from the same
  // home the map is centred on, so the page tells one consistent location
  // story rather than mixing landmarks across cities.
  const temple = templeDistance(primary?.distances ?? []);

  const wa = settings.whatsapp_number;
  const href = (context: string, extra = "") =>
    wa ? waContext(wa, context, extra) : null;

  const shareSummary = `${settings.business_name} — a home of your own in Deoghar, near Baba Baidyanath Dham. The whole flat is yours, at a fixed price, with free cancellation.`;

  const faq = buildFaq({
    sleeps: Math.max(0, ...properties.map((p) => p.sleeps)) || null,
    temple,
  });

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
          templeTime={travelTime(temple)}
        />
        <TrustRibbon />
        <MapStrip property={primary} />

        <HomesSection properties={properties} />

        <WhyApartment
          options={properties
            .filter((p) => p.ratePerNight !== null)
            .map((p) => ({ rate: p.ratePerNight as number, sleeps: p.sleeps }))}
          currency={currency}
          shareSummary={shareSummary}
        />

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
