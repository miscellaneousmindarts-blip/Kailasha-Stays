import { Fragment } from "react";
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
import { CustomSection } from "@/components/landing/custom-sections";
import { getLandingBase, finalizePropertyImages, waContext } from "@/lib/landing";
import { getHomepageContent } from "@/lib/homepage";
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

  // Two-phase: the homepage's own admin-edited sections have to be resolved
  // before the property cards' share of the 16-image budget is known — see
  // lib/landing.ts's getLandingBase()/finalizePropertyImages() split.
  const base = await getLandingBase();
  const content = await getHomepageContent(base.settings, base.properties, base.primary);
  const { settings, properties, addons, primary } = finalizePropertyImages(base, content.fixedImageCount);

  const year = new Date().getFullYear();
  const currency = properties[0]?.currency ?? "INR";

  const wa = settings.whatsapp_number;
  const href = (context: string, extra = "") => (wa ? waContext(wa, context, extra) : null);

  const shareSummary = `${settings.business_name} — a home of your own in Deoghar, near Baba Baidyanath Dham. The whole flat is yours, at a fixed price, with free cancellation.`;

  const rateOptions = properties
    .filter((p) => p.ratePerNight !== null)
    .map((p) => ({ rate: p.ratePerNight as number, sleeps: p.sleeps }));

  // Pulled out for cross-cutting uses: the hero photo backs the Shravan strip
  // and the JSON-LD image/logo at zero extra image-budget cost, and the FAQ
  // and proof entries feed the page's structured data.
  const heroEntry = content.order.find((e) => e.kind === "builtin" && e.key === "hero");
  const heroImage = heroEntry?.kind === "builtin" && heroEntry.key === "hero" ? heroEntry.resolved.image : null;
  const faqEntry = content.order.find((e) => e.kind === "builtin" && e.key === "faq");
  const faqItems = faqEntry?.kind === "builtin" && faqEntry.key === "faq" ? (faqEntry.resolved?.items ?? []) : [];
  const proofEntry = content.order.find((e) => e.kind === "builtin" && e.key === "proof");
  const proofResolved = proofEntry?.kind === "builtin" && proofEntry.key === "proof" ? proofEntry.resolved : null;

  const jsonLd = landingJsonLd({
    settings,
    properties,
    faq: faqItems,
    siteUrl: publicEnv.siteUrl,
    heroImage,
    googleRating: proofResolved?.stats.googleRating ?? null,
    googleCount: proofResolved?.stats.googleCount ?? 0,
    reviewsDisplayed: proofResolved?.reviews.length ?? 0,
  });

  return (
    <>
      <script
        type="application/ld+json"
        // Server-generated from our own data — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main>
        {content.order.map((entry) => {
          if (entry.kind === "custom") {
            return (
              <CustomSection key={entry.id} type={entry.type} content={entry.content} images={content.images} />
            );
          }

          switch (entry.key) {
            case "hero":
              return (
                <Fragment key={entry.id}>
                  <Hero
                    variant={variant}
                    whatsappHref={href("lp-hero")}
                    phone={settings.contact_phone}
                    shareSummary={shareSummary}
                    resolved={entry.resolved}
                  />
                </Fragment>
              );
            case "trust_ribbon":
              return (
                <Fragment key={entry.id}>
                  <TrustRibbon resolved={entry.resolved} />
                </Fragment>
              );
            case "map":
              return (
                <Fragment key={entry.id}>
                  <MapStrip property={primary} resolved={entry.resolved} />
                </Fragment>
              );
            case "homes":
              return (
                <Fragment key={entry.id}>
                  <HomesSection properties={properties} resolved={entry.resolved} />
                </Fragment>
              );
            case "why_apartment":
              return (
                <Fragment key={entry.id}>
                  <WhyApartment
                    options={rateOptions}
                    currency={currency}
                    shareSummary={shareSummary}
                    hotelRoomRate={settings.hotel_room_rate}
                    resolved={entry.resolved}
                  />
                </Fragment>
              );
            case "meet_host":
              return (
                <Fragment key={entry.id}>
                  <MeetHost
                    videoCallHref={href("lp-videocall", "Can you show me the flat on a video call?")}
                    phone={settings.contact_phone}
                    resolved={entry.resolved}
                  />
                </Fragment>
              );
            case "nothing_hidden":
              return (
                <Fragment key={entry.id}>
                  <NothingHidden resolved={entry.resolved} />
                </Fragment>
              );
            case "proof":
              return (
                <Fragment key={entry.id}>
                  <Proof resolved={entry.resolved} />
                </Fragment>
              );
            case "services":
              return (
                <Fragment key={entry.id}>
                  <ServicesStrip addons={addons} currency={currency} resolved={entry.resolved} />
                </Fragment>
              );
            case "shravan":
              return (
                <Fragment key={entry.id}>
                  <ShravanStrip year={year} resolved={entry.resolved} backgroundImage={heroImage} />
                </Fragment>
              );
            case "faq":
              return (
                <Fragment key={entry.id}>
                  <Faq resolved={entry.resolved} whatsappHref={href("lp-faq")} />
                </Fragment>
              );
            case "close":
              return (
                <Fragment key={entry.id}>
                  <Close
                    properties={properties}
                    whatsappHref={href("lp-close")}
                    phone={settings.contact_phone}
                    address={settings.address}
                    shareSummary={shareSummary}
                    mapsUrl={settings.maps_url}
                    resolved={entry.resolved}
                  />
                </Fragment>
              );
            default:
              return null;
          }
        })}
      </main>

      {wa ? (
        <StickyBar
          whatsappHref={waContext(wa, "lp-sticky")}
          phone={settings.contact_phone}
          replyMinutes={settings.reply_minutes}
          hoursStart={settings.hours_start}
          hoursStartHour={settings.hours_start_hour}
          hoursEndHour={settings.hours_end_hour}
        />
      ) : null}
    </>
  );
}
