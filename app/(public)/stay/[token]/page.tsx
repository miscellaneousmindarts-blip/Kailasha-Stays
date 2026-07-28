import type { Metadata } from "next";

import { SectionList } from "@/components/blocks/section-renderer";
import { PortalHeader } from "@/components/guest-portal/portal-header";
import { GettingThereSection } from "@/components/guest-portal/getting-there-section";
import { WifiSection } from "@/components/guest-portal/wifi-section";
import { ContactsSection } from "@/components/guest-portal/contacts-section";
import { AddonsSection } from "@/components/guest-portal/addons-section";
import { BillingSection } from "@/components/guest-portal/billing-section";
import { DocumentsSection } from "@/components/guest-portal/documents-section";
import { HouseRulesFooter } from "@/components/guest-portal/house-rules-footer";
import { InvalidToken } from "@/components/guest-portal/invalid-token";
import { getBookingBundle } from "@/lib/guest-portal";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your stay",
  robots: { index: false, follow: false },
};

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
          → pay → everything else. */}
      <PortalHeader bundle={bundle} />
      <GettingThereSection bundle={bundle} />
      <DocumentsSection token={token} bundle={bundle} />
      <BillingSection bundle={bundle} />
      <WifiSection bundle={bundle} />
      <ContactsSection bundle={bundle} />
      <AddonsSection token={token} bundle={bundle} />
      <SectionList sections={bundle.sections} />
      <HouseRulesFooter bundle={bundle} />
    </main>
  );
}
