"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addBookingAddon,
  addPayment,
  deleteBookingAddon,
  deletePayment,
  regeneratePortalToken,
  setBookingAddonStatus,
  setBookingStatus,
  updateBookingDetails,
} from "@/app/admin/(dashboard)/bookings/[id]/actions";
import { formatDate, money } from "@/lib/format";
import { nightsBetween, parseISODate } from "@/lib/date-utils";
import { whatsAppLink } from "@/lib/whatsapp";
import type { BookingForEdit } from "@/lib/admin/queries";

const SOURCE_STYLES: Record<string, string> = {
  direct: "bg-[#16a34a]/15 text-[#16a34a]",
  airbnb: "bg-[#e0484d]/15 text-[#e0484d]",
  booking_com: "bg-[#2563eb]/15 text-[#2563eb]",
  other: "bg-muted text-text-muted",
  blocked: "bg-muted text-text-muted",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  completed: "bg-muted text-text-muted",
};

export function BookingDetail({
  booking,
  siteUrl,
}: {
  booking: BookingForEdit;
  siteUrl: string;
}) {
  const nights = nightsBetween(
    parseISODate(booking.check_in),
    parseISODate(booking.check_out),
  );

  const confirmedAddonsTotal = booking.booking_addons
    .filter((a) => a.status === "confirmed")
    .reduce((sum, a) => sum + a.price * a.qty, 0);
  const paid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const total = booking.total_amount + confirmedAddonsTotal;
  const due = total - paid;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {booking.guest_name ?? "Blocked dates"}
          </h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${SOURCE_STYLES[booking.source]}`}
          >
            {booking.source.replace("_", ".")}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[booking.status]}`}
          >
            {booking.status}
          </span>
        </div>
        {booking.properties ? (
          <Link
            href={`/admin/listings/${booking.property_id}`}
            className="text-primary mt-1 inline-flex items-center gap-1 text-sm hover:underline"
          >
            {booking.properties.title}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
        <p className="text-text-muted mt-1">
          {formatDate(booking.check_in)} – {formatDate(booking.check_out)} ·{" "}
          {nights} {nights === 1 ? "night" : "nights"}
        </p>
      </div>

      <BasicsSection booking={booking} />

      {booking.source === "direct" && booking.portal_token ? (
        <PortalLinkSection booking={booking} siteUrl={siteUrl} />
      ) : null}

      <AddonsSection booking={booking} />

      <BillingSection
        baseTotal={booking.total_amount}
        addonsTotal={confirmedAddonsTotal}
        paid={paid}
        due={due}
        booking={booking}
      />

      <DocumentsSection booking={booking} />

      <CancelSection booking={booking} />
    </div>
  );
}

function BasicsSection({ booking }: { booking: BookingForEdit }) {
  const action = useSaveAction(updateBookingDetails);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Guest details</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(booking.id, new FormData(e.currentTarget));
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="guest_name">Guest name</Label>
            <Input
              id="guest_name"
              name="guest_name"
              defaultValue={booking.guest_name ?? ""}
              className="h-11"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={booking.phone ?? ""}
              className="h-11"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="guests">Guests</Label>
            <Input
              id="guests"
              name="guests"
              type="number"
              min={1}
              defaultValue={booking.guests ?? 1}
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="total_amount">Total amount for the stay (₹)</Label>
          <Input
            id="total_amount"
            name="total_amount"
            type="number"
            min={0}
            defaultValue={booking.total_amount}
            className="h-11"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={booking.notes ?? ""} />
        </div>
        <SaveBar pending={action.pending} saved={action.saved} error={action.error} />
      </form>
    </section>
  );
}

function PortalLinkSection({
  booking,
  siteUrl,
}: {
  booking: BookingForEdit;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState(booking.portal_token ?? "");
  const [regenPending, setRegenPending] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const link = `${siteUrl}/stay/${token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    setRegenPending(true);
    setRegenError(null);
    const result = await regeneratePortalToken(booking.id);
    setRegenPending(false);
    if (result.error) {
      setRegenError(result.error);
    } else if (result.token) {
      setToken(result.token);
    }
  }

  const waMessage = booking.properties
    ? `Namaste ${booking.guest_name ?? ""}! Your booking at ${booking.properties.title} is confirmed.\n${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}\nEverything you need (location, wifi, contacts): ${link}`
    : link;
  const waLink = booking.phone
    ? whatsAppLink(booking.phone.replace(/\D/g, ""), waMessage)
    : null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Guest portal link</h2>
      <div className="border-border rounded-md border p-4">
        <p className="tabular break-all text-sm">{link}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="border-border hover:bg-surface-subtle pressable flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
          >
            {copied ? (
              <Check className="text-success size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="pressable flex h-10 items-center gap-2 rounded-md bg-[#25D366] px-3 text-sm font-medium text-white"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Send on WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={regenerate}
            disabled={regenPending}
            className="border-border hover:bg-surface-subtle pressable flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
          >
            {regenPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Regenerate link
          </button>
        </div>
        <p className="text-text-muted mt-2 text-xs">
          Regenerating invalidates the previous link immediately.
        </p>
        {regenError ? (
          <p role="alert" className="text-danger mt-2 text-sm">
            {regenError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AddonsSection({ booking }: { booking: BookingForEdit }) {
  const [showAdd, setShowAdd] = useState(false);
  const add = useSaveAction(addBookingAddon);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Add-ons</h2>
      {booking.booking_addons.length ? (
        <div className="border-border divide-border divide-y rounded-md border">
          {booking.booking_addons.map((a) => (
            <AddonRow key={a.id} bookingId={booking.id} addon={a} />
          ))}
        </div>
      ) : null}

      {showAdd ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await add.runAndWait(booking.id, new FormData(e.currentTarget));
            if (ok) setShowAdd(false);
          }}
          className="border-border mt-3 space-y-3 rounded-md border p-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="name" placeholder="Add-on name" required className="h-10" />
            <Input name="price" type="number" min={0} placeholder="Price" className="h-10" />
            <Input name="qty" type="number" min={1} defaultValue={1} placeholder="Qty" className="h-10" />
          </div>
          {add.error ? <p role="alert" className="text-danger text-sm">{add.error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={add.pending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-10 items-center rounded-md px-4 text-sm font-medium"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="hover:bg-surface-subtle pressable flex h-10 items-center rounded-md px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="hover:bg-surface-subtle pressable mt-3 flex h-10 items-center rounded-md border border-dashed px-4 text-sm font-medium"
        >
          + Add add-on
        </button>
      )}
    </section>
  );
}

function AddonRow({
  bookingId,
  addon,
}: {
  bookingId: string;
  addon: BookingForEdit["booking_addons"][number];
}) {
  const status = useSaveAction(setBookingAddonStatus);
  const del = useSaveAction(deleteBookingAddon);

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{addon.name}</p>
        <p className="text-text-muted text-sm">
          {money(addon.price)} × {addon.qty} ={" "}
          <span className="tabular">{money(addon.price * addon.qty)}</span>
        </p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          addon.status === "confirmed"
            ? "bg-success/15 text-success"
            : addon.status === "requested"
              ? "bg-warning/15 text-warning"
              : "bg-muted text-text-muted"
        }`}
      >
        {addon.status}
      </span>
      {addon.status === "requested" ? (
        <>
          <button
            type="button"
            onClick={() => status.run(bookingId, addon.id, "confirmed")}
            disabled={status.pending}
            aria-label="Confirm add-on"
            className="text-success hover:bg-success/10 pressable flex size-9 items-center justify-center rounded-full"
          >
            <Check className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => status.run(bookingId, addon.id, "cancelled")}
            disabled={status.pending}
            aria-label="Decline add-on"
            className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-full"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => del.run(bookingId, addon.id)}
        disabled={del.pending}
        aria-label="Remove add-on"
        className="text-text-muted hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function BillingSection({
  baseTotal,
  addonsTotal,
  paid,
  due,
  booking,
}: {
  baseTotal: number;
  addonsTotal: number;
  paid: number;
  due: number;
  booking: BookingForEdit;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const add = useSaveAction(addPayment);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Billing</h2>
      <div className="border-border grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-4">
        <Stat label="Stay" value={money(baseTotal)} />
        <Stat label="Add-ons" value={money(addonsTotal)} />
        <Stat label="Paid" value={money(paid)} />
        <Stat
          label="Due"
          value={money(due)}
          emphasize={due > 0}
        />
      </div>

      {booking.payments.length ? (
        <div className="border-border divide-border mt-3 divide-y rounded-md border">
          {booking.payments.map((p) => (
            <PaymentRow key={p.id} bookingId={booking.id} payment={p} />
          ))}
        </div>
      ) : null}

      {showAdd ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await add.runAndWait(booking.id, new FormData(e.currentTarget));
            if (ok) setShowAdd(false);
          }}
          className="border-border mt-3 space-y-3 rounded-md border p-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="amount" type="number" min={0} placeholder="Amount" required className="h-10" />
            <Input name="method" placeholder="Method (UPI, cash...)" className="h-10" />
            <Input name="paid_at" type="date" className="h-10" />
          </div>
          <Input name="note" placeholder="Note (optional)" className="h-10" />
          {add.error ? <p role="alert" className="text-danger text-sm">{add.error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={add.pending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-10 items-center rounded-md px-4 text-sm font-medium"
            >
              Record payment
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="hover:bg-surface-subtle pressable flex h-10 items-center rounded-md px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="hover:bg-surface-subtle pressable mt-3 flex h-10 items-center rounded-md border border-dashed px-4 text-sm font-medium"
        >
          + Record payment
        </button>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string | null;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-text-muted text-sm">{label}</p>
      <p className={`tabular font-semibold ${emphasize ? "text-primary" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function PaymentRow({
  bookingId,
  payment,
}: {
  bookingId: string;
  payment: BookingForEdit["payments"][number];
}) {
  const del = useSaveAction(deletePayment);

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="tabular text-sm font-medium">{money(payment.amount)}</p>
        <p className="text-text-muted text-sm">
          {formatDate(payment.paid_at)}
          {payment.method ? ` · ${payment.method}` : ""}
          {payment.note ? ` · ${payment.note}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => del.run(bookingId, payment.id)}
        disabled={del.pending}
        aria-label="Delete payment"
        className="text-text-muted hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function DocumentsSection({ booking }: { booking: BookingForEdit }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Guest documents</h2>
      {booking.guest_documents.length ? (
        <ul className="border-border divide-border divide-y rounded-md border">
          {booking.guest_documents.map((d) => (
            <li key={d.id} className="p-3 text-sm">
              <span className="font-medium">{d.guest_name ?? "Guest"}</span>{" "}
              <span className="text-text-muted">
                · {d.doc_type} · uploaded {formatDate(d.uploaded_at)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted text-sm">
          No documents yet — guests can upload IDs from their portal link
          {booking.guests ? ` (${booking.guests} expected)` : ""}.
        </p>
      )}
    </section>
  );
}

function CancelSection({ booking }: { booking: BookingForEdit }) {
  const status = useSaveAction(setBookingStatus);
  const [confirming, setConfirming] = useState(false);

  if (booking.status === "cancelled") {
    return <p className="text-text-muted text-sm">This booking is cancelled.</p>;
  }

  return (
    <section className="border-border border-t pt-6">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">Cancel this booking? This frees the dates.</span>
          <button
            type="button"
            onClick={() => status.run(booking.id, "cancelled")}
            disabled={status.pending}
            className="bg-danger pressable flex h-10 items-center rounded-md px-4 text-sm font-medium text-white"
          >
            Yes, cancel booking
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="hover:bg-surface-subtle pressable flex h-10 items-center rounded-md px-4 text-sm font-medium"
          >
            Never mind
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-danger hover:bg-danger/10 pressable flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Cancel booking
        </button>
      )}
      {status.error ? <p role="alert" className="text-danger mt-2 text-sm">{status.error}</p> : null}
    </section>
  );
}
