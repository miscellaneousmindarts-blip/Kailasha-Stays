import { landingConfig } from "@/lib/landing-config";
import { imageUrl } from "@/lib/images";
import type { LandingProperty } from "@/lib/landing";
import type { FaqItem } from "@/lib/landing-faq";
import type { SiteSettings } from "@/lib/types/database";

/**
 * JSON-LD for the landing page.
 *
 * `aggregateRating` is included ONLY when there are genuinely displayed,
 * first-party reviews to back it. Importing an OTA average and presenting it
 * as your own is a policy violation, and an unbacked rating is exactly the
 * kind of claim this page is otherwise built to avoid.
 */
export function landingJsonLd({
  settings,
  properties,
  faq,
  siteUrl,
}: {
  settings: SiteSettings;
  properties: LandingProperty[];
  faq: FaqItem[];
  siteUrl: string;
}) {
  const { proof, links } = landingConfig;
  const heroImage = imageUrl(landingConfig.images.hero.path);

  const canShowRating =
    proof.googleRating !== null && proof.reviews.length > 0 && proof.googleCount > 0;

  const lodging: Record<string, unknown> = {
    "@type": "LodgingBusiness",
    "@id": `${siteUrl}/#business`,
    name: settings.business_name,
    url: siteUrl,
    ...(heroImage ? { image: heroImage } : {}),
    ...(settings.contact_phone ? { telephone: settings.contact_phone } : {}),
    priceRange: "₹₹",
    checkinTime: settings.default_check_in_time,
    checkoutTime: settings.default_check_out_time,
    address: {
      "@type": "PostalAddress",
      ...(settings.address ? { streetAddress: settings.address } : {}),
      addressLocality: "Deoghar",
      addressRegion: "Jharkhand",
      addressCountry: "IN",
    },
    ...(links.mapsUrl ? { hasMap: links.mapsUrl } : {}),
    amenityFeature: [
      "Kitchen",
      "Air conditioning",
      "Hot water 24x7",
      "Power backup",
      "Free parking",
      "Wifi",
    ].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    ...(canShowRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: proof.googleRating,
            reviewCount: proof.googleCount,
          },
        }
      : {}),
  };

  const itemList = {
    "@type": "ItemList",
    itemListElement: properties.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `${siteUrl}/properties/${p.slug}`,
    })),
  };

  const faqPage = {
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const organization = {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: settings.business_name,
    url: siteUrl,
    ...(heroImage ? { logo: heroImage } : {}),
    ...(links.instagram || links.facebook
      ? { sameAs: [links.instagram, links.facebook].filter(Boolean) }
      : {}),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Our homes",
        item: `${siteUrl}/properties`,
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [lodging, itemList, faqPage, organization, breadcrumb],
  };
}
