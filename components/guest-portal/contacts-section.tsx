import { MessageCircle, Phone, Users } from "lucide-react";

import { whatsAppLink } from "@/lib/whatsapp";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function ContactsSection({ bundle }: { bundle: GuestBookingBundle }) {
  if (!bundle.contacts.length) return null;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Users className="text-primary size-5" aria-hidden="true" />
        Important contacts
      </h2>
      <div className="border-border divide-border divide-y rounded-md border">
        {bundle.contacts.map((c, i) => {
          const digits = c.phone.replace(/\D/g, "");
          return (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                {c.role ? <p className="text-text-muted text-sm">{c.role}</p> : null}
              </div>
              <a
                href={`tel:${digits}`}
                aria-label={`Call ${c.name}`}
                className="border-border hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-full border"
              >
                <Phone className="size-4" aria-hidden="true" />
              </a>
              <a
                href={whatsAppLink(digits, "")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${c.name}`}
                className="pressable flex size-11 items-center justify-center rounded-full bg-[#25D366] text-white"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
