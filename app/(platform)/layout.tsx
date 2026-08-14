import type { Metadata } from "next";

import { PlatformHeader } from "@/components/platform/platform-header";
import { PlatformFooter } from "@/components/platform/platform-footer";
import { getPlatformProperties } from "@/lib/platform";
import { resolvePlatformLogoSrc } from "@/lib/platform-assets";
import { PLATFORM_SITE_URL } from "@/lib/platform-content";

/**
 * The platform's own identity — not any tenant's. Overrides the root
 * layout's "Stays in Vrindavan" default the same way the tenant layout
 * (app/(public)/s/[tenant]/layout.tsx) overrides it per tenant; this is the
 * third identity now sharing the root layout, for the apex itself.
 *
 * docs/apex-page-plan.md §5: title/description are the strategy doc's
 * proposed values, aimed at the "homestay in Deoghar" / "family flat"
 * cluster rather than the old B2B "we build booking sites" pitch — the
 * apex is now the guest-facing marketplace, and the host pitch moved to
 * §S11's band further down the same page.
 */
export const metadata: Metadata = {
  // `absolute`, not a plain string: a plain string is a %s slot the ROOT
  // layout's "%s | Stays in Vrindavan" template would still wrap around —
  // exactly the leak the tenant layout already had to guard against the
  // same way. `absolute` is the one form no ancestor template touches.
  title: { absolute: "Homestays & Family Flats in Deoghar Near Baba Baidyanath" },
  description:
    "Verified whole-flat homestays in Deoghar, minutes from Baba Baidyanath Dham. Fixed prices in writing, free cancellation, pooja & pickup arranged.",
  alternates: { canonical: PLATFORM_SITE_URL },
  robots: { index: true, follow: true },
};

/**
 * Header and footer live here, not in each page, now that there are two
 * pages under this layout (the homepage and /stays/[slug]) that both need
 * them. getPlatformProperties() is React cache()-wrapped, so this call and
 * the homepage's own call for its grid dedupe to one round trip per request,
 * not two.
 *
 * StickyBar stays OUT of here deliberately — see app/(platform)/page.tsx.
 * BookingCard on the property page renders its own fixed bottom bar, and a
 * second one from this layout would stack on top of it and make the actual
 * booking button unreachable on a phone.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const properties = await getPlatformProperties();
  const logoSrc = resolvePlatformLogoSrc();

  return (
    <div className="flex flex-1 flex-col">
      <PlatformHeader logoSrc={logoSrc} guidesReady={false} />
      <div className="flex flex-1 flex-col">{children}</div>
      <PlatformFooter properties={properties} />
    </div>
  );
}
