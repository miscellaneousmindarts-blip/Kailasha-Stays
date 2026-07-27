"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addCalendarSource,
  deleteCalendarSource,
  syncSourceNow,
} from "@/app/admin/(dashboard)/settings/actions";
import type { PropertyOption } from "@/lib/admin/queries";
import type { CalendarSource } from "@/lib/types/database";

const PLATFORM_LABEL: Record<string, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  other: "Other",
};

function SourceRow({ source }: { source: CalendarSource }) {
  const sync = useSaveAction(syncSourceNow);
  const del = useSaveAction(deleteCalendarSource);

  return (
    <div className="border-border flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0">
      <span className="bg-surface-subtle rounded-full px-2.5 py-1 text-xs font-medium">
        {PLATFORM_LABEL[source.platform] ?? source.platform}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{source.ical_url}</p>
        <p className="text-text-muted mt-0.5 flex items-center gap-1.5 text-xs">
          {source.last_status === "ok" ? (
            <CheckCircle2 className="text-success size-3.5" aria-hidden="true" />
          ) : source.last_status === "error" ? (
            <AlertTriangle className="text-danger size-3.5" aria-hidden="true" />
          ) : null}
          {source.last_synced_at
            ? `Last synced ${new Date(source.last_synced_at).toLocaleString("en-IN")}`
            : "Never synced yet"}
          {source.last_status === "error" && source.last_error ? ` · ${source.last_error}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => sync.run(source.id)}
        disabled={sync.pending}
        className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
      >
        {sync.pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="size-3.5" aria-hidden="true" />
        )}
        Sync now
      </button>
      <button
        type="button"
        onClick={() => del.run(source.id)}
        disabled={del.pending}
        aria-label="Remove calendar source"
        className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-full"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      {sync.error ? <p role="alert" className="text-danger w-full text-sm">{sync.error}</p> : null}
      {del.error ? <p role="alert" className="text-danger w-full text-sm">{del.error}</p> : null}
    </div>
  );
}

function AddSourceForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const add = useSaveAction(addCalendarSource);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-surface-subtle pressable flex h-10 items-center rounded-md border border-dashed px-3 text-sm font-medium"
      >
        + Add calendar source
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await add.runAndWait(propertyId, new FormData(e.currentTarget));
        if (ok) {
          setOpen(false);
          e.currentTarget.reset();
        }
      }}
      className="border-border space-y-3 rounded-md border p-3"
    >
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <select
          name="platform"
          defaultValue="airbnb"
          className="border-border h-10 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="airbnb">Airbnb</option>
          <option value="booking_com">Booking.com</option>
          <option value="other">Other</option>
        </select>
        <Input name="ical_url" placeholder="https://... .ics" required className="h-10" />
      </div>
      {add.error ? <p role="alert" className="text-danger text-sm">{add.error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={add.pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-9 items-center rounded-md px-4 text-sm font-medium"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-4 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ExportUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-surface-subtle mt-3 flex items-center gap-2 rounded-md p-3">
      <p className="tabular min-w-0 flex-1 truncate text-sm">{url}</p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="border-border hover:bg-background pressable flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-transparent px-3 text-sm font-medium"
      >
        {copied ? (
          <Check className="text-success size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function CalendarSourcesPanel({
  properties,
  sources,
  exportBaseUrl,
  exportKey,
}: {
  properties: PropertyOption[];
  sources: CalendarSource[];
  exportBaseUrl: string;
  exportKey: string;
}) {
  return (
    <div className="max-w-2xl space-y-8">
      {properties.map((property) => {
        const propertySources = sources.filter((s) => s.property_id === property.id);
        return (
          <div key={property.id}>
            <h3 className="font-semibold">{property.title}</h3>

            <p className="text-text-muted mt-1 text-sm">
              Export URL — paste this into Airbnb&apos;s or Booking.com&apos;s
              &quot;import a calendar&quot; setting so a direct booking blocks
              those platforms too.
            </p>
            <ExportUrl url={`${exportBaseUrl}/${property.id}?key=${exportKey}`} />

            <p className="text-text-muted mt-4 text-sm">
              Import — paste their calendar export URL here so their bookings
              block your site and admin calendar too. Syncs automatically
              every 30 minutes; platforms may take a few hours to reflect a
              new block on their side.
            </p>
            {propertySources.length ? (
              <div className="border-border mt-2 rounded-md border">
                {propertySources.map((s) => (
                  <SourceRow key={s.id} source={s} />
                ))}
              </div>
            ) : null}
            <div className="mt-2">
              <AddSourceForm propertyId={property.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
