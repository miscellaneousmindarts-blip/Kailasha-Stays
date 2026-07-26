import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { getSiteSettings } from "@/lib/settings";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();

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
          <Link href="/properties" className="hover:text-primary flex min-h-11 items-center">
            All properties
          </Link>
        </div>
      </div>

      <div className="container-page border-border text-text-muted border-t py-6 text-sm">
        © {year} {settings.business_name}
      </div>
    </footer>
  );
}
