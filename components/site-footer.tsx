import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import type { PublicSiteBranding } from "@/lib/types/database";

export function SiteFooter({
  settings,
  basePath,
}: {
  settings: PublicSiteBranding;
  /** "" for the tenant served at the bare domain, "/s/{slug}" otherwise. */
  basePath: string;
}) {
  const year = new Date().getFullYear();
  // The legal fine print names whichever entity the owner actually
  // registered under, if it differs from the public-facing business name —
  // most tenants leave this blank and the public name is used for both.
  const legalName = settings.legal_name || settings.business_name;

  return (
    <footer className="bg-surface-subtle border-border mt-16 border-t">
      <div className="container-page flex flex-col gap-8 py-12 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold">{settings.business_name}</p>
          {settings.address ? (
            <p className="text-text-muted mt-2 flex max-w-xs items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {settings.address}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 text-sm">
          {settings.contact_phone ? (
            <a
              href={`tel:${settings.contact_phone}`}
              className="hover:text-primary flex min-h-11 items-center gap-2"
            >
              <Phone className="size-4" aria-hidden="true" />
              {settings.contact_phone}
            </a>
          ) : null}
          {settings.contact_email ? (
            <a
              href={`mailto:${settings.contact_email}`}
              className="hover:text-primary flex min-h-11 items-center gap-2"
            >
              <Mail className="size-4" aria-hidden="true" />
              {settings.contact_email}
            </a>
          ) : null}
          <Link href={`${basePath}/properties`} className="hover:text-primary flex min-h-11 items-center">
            All properties
          </Link>
        </div>
      </div>

      <div className="container-page border-border text-text-muted border-t py-6 text-sm">
        <p>
          © {year} {legalName}
        </p>
        {settings.footer_note ? <p className="mt-1">{settings.footer_note}</p> : null}
      </div>
    </footer>
  );
}
