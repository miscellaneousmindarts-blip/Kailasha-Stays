import type { LandingProperty } from "@/lib/landing";
import type { ResolvedFaqItem, ResolvedImage } from "@/lib/homepage";
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
  heroImage,
  googleRating,
  googleCount,
  reviewsDisplayed,
}: {
  settings: SiteSettings;
  properties: LandingProperty[];
  faq: ResolvedFaqItem[];
  siteUrl: string;
  heroImage: ResolvedImage | null;
  googleRating: number | null;
  googleCount: number;
  /** How many reviews are actually shown on the page — an unbacked rating is not claimed. */
  reviewsDisplayed: number;
}) {
  const canShowRating = googleRating !== null && reviewsDisplayed > 0 && googleCount > 0;

  const lodging: Record<string, unknown> = {
    "@type": "LodgingBusiness",
    "@id": `${siteUrl}/#business`,
    name: settings.business_name,
    url: siteUrl,
    ...(heroImage ? { image: heroImage.url } : {}),
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
    ...(settings.maps_url ? { hasMap: settings.maps_url } : {}),
    amenityFeature: [
      // Not "Kitchen" — there is no full kitchen, only an induction hob, and
      // the FAQ says so explicitly. Structured data claiming otherwise would
      // contradict the page's own honesty rules.
      "Induction hob",
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
            ratingValue: googleRating,
            reviewCount: googleCount,
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
    ...(heroImage ? { logo: heroImage.url } : {}),
    ...(settings.instagram_url || settings.facebook_url
      ? { sameAs: [settings.instagram_url, settings.facebook_url].filter(Boolean) }
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
