import type { Metadata } from "next";

import { SectionList } from "@/components/blocks/section-renderer";
import { PortalHeader } from "@/components/guest-portal/portal-header";
import { GettingThereSection } from "@/components/guest-portal/getting-there-section";
import { WifiSection } from "@/components/guest-portal/wifi-section";
import { ContactsSection } from "@/components/guest-portal/contacts-section";
import { AddonsSection } from "@/components/guest-portal/addons-section";
import { BillingSection } from "@/components/guest-portal/billing-section";
import { RoomServiceSection } from "@/components/guest-portal/room-service-section";
import { DocumentsSection } from "@/components/guest-portal/documents-section";
import { HouseRulesFooter } from "@/components/guest-portal/house-rules-footer";
import { InvalidToken } from "@/components/guest-portal/invalid-token";
import { getBookingBundle } from "@/lib/guest-portal";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Per-booking rather than static, and `absolute` rather than a plain string —
 * both matter. A plain string title doesn't stop an ancestor template from
 * wrapping around it, and per Next's own docs a layout's title.template
 * never applies to a page.js at that same route segment anyway (it only
 * reaches child segments), so there is no template to lean on here at all:
 * without `absolute`, the closest one that DOES apply is the root layout's
 * hardcoded "%s | Stays in Vrindavan" — the original single-tenant app's
 * name, wrapped around this page's title regardless of which tenant's
 * booking it actually is. Same fix already used by the tenant homepage
 * (app/(public)/s/[tenant]/page.tsx's PRIMARY_HOME_METADATA / absolute).
 * Falls back to the bare title for a token that doesn't resolve, since
 * there's no tenant to name at that point.
 */
export async function generateMetadata(
  props: PageProps<"/stay/[token]">,
): Promise<Metadata> {
  const { token } = await props.params;
  const bundle = await getBookingBundle(token);
  const businessName = bundle?.settings?.business_name;

  return {
    title: { absolute: businessName ? `Your stay | ${businessName}` : "Your stay" },
    robots: { index: false, follow: false },
  };
}

export default async function GuestPortalPage(
  props: PageProps<"/stay/[token]">,
) {
  const { token } = await props.params;
  const bundle = await getBookingBundle(token);

  if (!bundle) {
    const settings = await getSiteSettings();
    return <InvalidToken settings={settings} />;
  }

  return (
    <main className="container-page max-w-2xl py-6 md:py-10">
      {/* Priority order: confirmed (in the header) → where to go → upload ID
          → pay → room service → everything else. */}
      <PortalHeader bundle={bundle} />
      <GettingThereSection bundle={bundle} />
      <DocumentsSection token={token} bundle={bundle} />
      <BillingSection bundle={bundle} />
      <RoomServiceSection bundle={bundle} />
      <WifiSection bundle={bundle} />
      <ContactsSection bundle={bundle} />
      <AddonsSection token={token} bundle={bundle} />
      <SectionList sections={bundle.sections} />
      <HouseRulesFooter bundle={bundle} />
    </main>
  );
}
