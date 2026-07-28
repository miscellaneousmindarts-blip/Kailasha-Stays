"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ConvertToBookingForm } from "@/components/admin/convert-to-booking-form";
import { useSaveAction } from "@/components/admin/use-save-action";
import { setEnquiryStatus } from "@/app/admin/(dashboard)/enquiries/actions";
import { formatDate } from "@/lib/format";
import { whatsAppLink } from "@/lib/whatsapp";
import type { EnquiryRow, PropertyPricing } from "@/lib/admin/queries";
import type { AddonServiceData } from "@/lib/queries";
import type { EnquiryStatus } from "@/lib/types/database";

const STATUS_FILTERS: { value: EnquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: "bg-primary-tint text-primary",
  contacted: "bg-warning/15 text-warning",
  converted: "bg-success/15 text-success",
  closed: "bg-muted text-text-muted",
};

export function EnquiriesList({
  enquiries,
  allAddons,
  pricing,
}: {
  enquiries: EnquiryRow[];
  allAddons: AddonServiceData[];
  pricing: Record<string, PropertyPricing>;
}) {
  const [filter, setFilter] = useState<EnquiryStatus | "all">("all");
  const [selected, setSelected] = useState<EnquiryRow | null>(null);

  const filtered = useMemo(
    () =>
      filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter),
    [enquiries, filter],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`pressable flex h-9 items-center rounded-full border px-3 text-sm font-medium ${
              filter === f.value
                ? "border-primary bg-primary-tint text-primary"
                : "border-border hover:bg-surface-subtle"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border-border mt-6 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No enquiries here</p>
          <p className="text-text-muted mt-1 text-sm">
            New enquiries from the Book Direct form will show up here.
          </p>
        </div>
      ) : (
        <ul className="border-border divide-border mt-4 divide-y rounded-lg border">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelected(e)}
                className="hover:bg-surface-subtle pressable flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-text-muted truncate text-sm">
                    {e.properties?.title ?? "Unknown property"} ·{" "}
                    {formatDate(e.check_in)} – {formatDate(e.check_out)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[e.status]}`}
                >
                  {e.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <EnquiryDetail
          enquiry={selected}
          addons={allAddons}
          pricing={pricing[selected.property_id] ?? null}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function EnquiryDetail({
  enquiry,
  addons,
  pricing,
  onClose,
}: {
  enquiry: EnquiryRow;
  addons: AddonServiceData[];
  pricing: PropertyPricing | null;
  onClose: () => void;
}) {
  const statusAction = useSaveAction(setEnquiryStatus);
  const [converting, setConverting] = useState(false);

  const requestedAddons = addons.filter((a) => enquiry.addon_ids.includes(a.id));
  const waMsg = `Namaste ${enquiry.name}! Thanks for your enquiry about ${enquiry.properties?.title ?? "our property"} (${formatDate(enquiry.check_in)} – ${formatDate(enquiry.check_out)}). `;
  const waLink = whatsAppLink(enquiry.phone.replace(/\D/g, ""), waMsg);

  return (
    <ResponsiveModal open onClose={onClose} title="Enquiry">
      {converting ? (
        <ConvertToBookingForm
          enquiry={enquiry}
          addons={requestedAddons}
          pricing={pricing}
          onCancel={() => setConverting(false)}
        />
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-lg font-semibold">{enquiry.name}</p>
            <p className="text-text-muted">{enquiry.phone}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-text-muted">Property</dt>
              <dd className="font-medium">{enquiry.properties?.title ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Guests</dt>
              <dd className="font-medium">{enquiry.guests}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Check-in</dt>
              <dd className="font-medium">{formatDate(enquiry.check_in)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Check-out</dt>
              <dd className="font-medium">{formatDate(enquiry.check_out)}</dd>
            </div>
          </dl>

          {requestedAddons.length ? (
            <div>
              <p className="text-text-muted text-sm">Requested add-ons</p>
              <ul className="mt-1 text-sm">
                {requestedAddons.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {enquiry.message ? (
            <div>
              <p className="text-text-muted text-sm">Message</p>
              <p className="mt-1 text-sm">{enquiry.message}</p>
            </div>
          ) : null}

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable flex h-12 items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 font-medium text-white"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Reply on WhatsApp
          </a>

          <div className="flex flex-wrap gap-2">
            {enquiry.status !== "contacted" ? (
              <button
                type="button"
                onClick={() => statusAction.run(enquiry.id, "contacted")}
                disabled={statusAction.pending}
                className="border-border hover:bg-surface-subtle pressable flex h-10 items-center rounded-md border px-3 text-sm font-medium"
              >
                Mark contacted
              </button>
            ) : null}
            {enquiry.status !== "closed" ? (
              <button
                type="button"
                onClick={() => statusAction.run(enquiry.id, "closed")}
                disabled={statusAction.pending}
                className="border-border hover:bg-surface-subtle pressable flex h-10 items-center rounded-md border px-3 text-sm font-medium"
              >
                Close
              </button>
            ) : null}
          </div>
          {statusAction.error ? (
            <p role="alert" className="text-danger text-sm">
              {statusAction.error}
            </p>
          ) : null}

          {enquiry.status !== "converted" ? (
            <button
              type="button"
              onClick={() => setConverting(true)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 w-full items-center justify-center rounded-md font-medium"
            >
              Convert to booking
            </button>
          ) : (
            <p className="text-success text-center text-sm font-medium">
              Already converted to a booking.
            </p>
          )}
        </div>
      )}
    </ResponsiveModal>
  );
}
