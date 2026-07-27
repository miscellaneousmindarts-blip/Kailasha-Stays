import { MessageCircle, Phone } from "lucide-react";

import { whatsAppLink } from "@/lib/whatsapp";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function HouseRulesFooter({ bundle }: { bundle: GuestBookingBundle }) {
  const { property, settings } = bundle;

  return (
    <footer className="border-border border-t py-6">
      {property?.house_rules ? (
        <>
          <h2 className="mb-2 text-lg font-semibold">House rules</h2>
          <p className="text-text-muted whitespace-pre-line">{property.house_rules}</p>
        </>
      ) : null}

      {settings ? (
        <div className="mt-6 space-y-2">
          <p className="font-medium">Need anything? Reach {settings.business_name}.</p>
          <div className="flex flex-wrap gap-2">
            {settings.whatsapp_number ? (
              <a
                href={whatsAppLink(settings.whatsapp_number, "")}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable flex h-11 items-center gap-2 rounded-md bg-[#25D366] px-4 font-medium text-white"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </a>
            ) : null}
            {settings.contact_phone ? (
              <a
                href={`tel:${settings.contact_phone}`}
                className="border-border hover:bg-surface-subtle pressable flex h-11 items-center gap-2 rounded-md border px-4 font-medium"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call
              </a>
            ) : null}
          </div>
          {settings.response_note ? (
            <p className="text-text-muted text-sm">{settings.response_note}</p>
          ) : null}
        </div>
      ) : null}
    </footer>
  );
}
