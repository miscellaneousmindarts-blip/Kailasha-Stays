import { ExternalLink, FileText, UtensilsCrossed } from "lucide-react";

import { propertyDocumentUrl } from "@/lib/images";
import type { GuestBookingBundle } from "@/lib/types/guest-portal";

export function RoomServiceSection({ bundle }: { bundle: GuestBookingBundle }) {
  const property = bundle.property;
  if (!property?.room_service_link && !property?.room_service_pdf_path) return null;

  return (
    <section className="border-border border-t py-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <UtensilsCrossed className="text-primary size-5" aria-hidden="true" />
        Room service
      </h2>
      <div className="flex flex-wrap gap-2">
        {property.room_service_link ? (
          <a
            href={property.room_service_link}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:bg-surface-subtle pressable flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            View menu
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
        {property.room_service_pdf_path ? (
          <a
            href={propertyDocumentUrl(property.room_service_pdf_path) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:bg-surface-subtle pressable flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <FileText className="size-4" aria-hidden="true" />
            Menu PDF
          </a>
        ) : null}
      </div>
    </section>
  );
}
