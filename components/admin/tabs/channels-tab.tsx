"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addBookingChannel,
  deleteBookingChannel,
  reorderBookingChannel,
  setBookingChannelActive,
  updateBookingChannel,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import { formatDate, money } from "@/lib/format";
import type { PropertyForEdit } from "@/lib/admin/queries";
import type { BookingChannel, CalendarSource, ChannelPriceMode } from "@/lib/types/database";

/**
 * Common platforms, offered as one-tap presets. Not a fixed list — "Other"
 * takes any name — but typing "Booking.com" correctly on a phone every time
 * is exactly the kind of friction a preset removes.
 */
const PRESETS = [
  "Airbnb",
  "Booking.com",
  "MakeMyTrip",
  "Goibibo",
  "Agoda",
  "Expedia",
];

export function ChannelsTab({ property }: { property: PropertyForEdit }) {
  const [adding, setAdding] = useState(false);
  const channels = property.booking_channels;
  const sourceByChannel = new Map(
    property.calendar_sources
      .filter((s) => s.channel_id)
      .map((s) => [s.channel_id as string, s]),
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Where guests can book</h2>
        <p className="text-text-muted mt-1 text-sm">
          Every platform you&apos;re listed on, with its price and calendar. Guests see
          these alongside your direct price, so they can compare — booking direct is
          always shown first.
        </p>
      </div>

      {channels.length ? (
        <ul className="space-y-3">
          {channels.map((channel, i) => (
            <ChannelCard
              key={channel.id}
              propertyId={property.id}
              channel={channel}
              source={sourceByChannel.get(channel.id) ?? null}
              currency={property.currency}
              basePrice={property.base_price}
              isFirst={i === 0}
              isLast={i === channels.length - 1}
            />
          ))}
        </ul>
      ) : (
        <div className="border-border rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">No other platforms yet</p>
          <p className="text-text-muted mt-1 text-sm">
            Guests currently only see the direct booking option.
          </p>
        </div>
      )}

      {adding ? (
        <ChannelForm
          propertyId={property.id}
          currency={property.currency}
          basePrice={property.base_price}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border-border hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a platform
        </button>
      )}
    </div>
  );
}

function ChannelCard({
  propertyId,
  channel,
  source,
  currency,
  basePrice,
  isFirst,
  isLast,
}: {
  propertyId: string;
  channel: BookingChannel;
  source: CalendarSource | null;
  currency: string;
  basePrice: number | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const activeAction = useSaveAction(setBookingChannelActive);
  const reorderAction = useSaveAction(reorderBookingChannel);
  const deleteAction = useSaveAction(deleteBookingChannel);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <li>
        <ChannelForm
          propertyId={propertyId}
          channel={channel}
          source={source}
          currency={currency}
          basePrice={basePrice}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={`border-border rounded-lg border p-4 ${channel.active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{channel.name}</p>
            {!channel.active ? (
              <span className="bg-muted text-text-muted rounded-full px-2 py-0.5 text-xs font-medium">
                hidden
              </span>
            ) : null}
            {source ? (
              <span className="text-text-muted flex items-center gap-1 text-xs">
                <RefreshCw className="size-3" aria-hidden="true" />
                {source.last_synced_at
                  ? `synced ${formatDate(source.last_synced_at)}`
                  : "calendar not synced yet"}
              </span>
            ) : null}
          </div>
          <p className="text-text-muted mt-1 text-sm">
            <PriceSummary channel={channel} basePrice={basePrice} currency={currency} />
          </p>
          {channel.booking_url ? (
            <a
              href={channel.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted mt-0.5 flex items-center gap-1 truncate text-sm hover:underline"
            >
              <span className="truncate">{channel.booking_url}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-warning mt-0.5 text-sm">No booking link</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => reorderAction.run(propertyId, channel.id, "up")}
            disabled={isFirst || reorderAction.pending}
            aria-label={`Move ${channel.name} up`}
            className="hover:bg-surface-subtle pressable flex size-8 items-center justify-center rounded-md disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => reorderAction.run(propertyId, channel.id, "down")}
            disabled={isLast || reorderAction.pending}
            aria-label={`Move ${channel.name} down`}
            className="hover:bg-surface-subtle pressable flex size-8 items-center justify-center rounded-md disabled:opacity-30"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center rounded-md border px-3 text-sm font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => activeAction.run(propertyId, channel.id, !channel.active)}
          disabled={activeAction.pending}
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60"
        >
          {activeAction.pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {channel.active ? "Hide from site" : "Show on site"}
        </button>

        <div className="ml-auto">
          {confirmingDelete ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => deleteAction.run(propertyId, channel.id)}
                disabled={deleteAction.pending}
                className="bg-danger pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {deleteAction.pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="hover:bg-surface-subtle pressable flex h-9 items-center rounded-md px-3 text-sm font-medium"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Remove ${channel.name}`}
              className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-md"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {confirmingDelete ? (
        <p className="text-text-muted mt-2 text-sm">
          Removes this platform from your booking page
          {source ? " and stops syncing its calendar" : ""}. Bookings already synced
          from it stay put.
        </p>
      ) : null}

      {activeAction.error || reorderAction.error || deleteAction.error ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {activeAction.error || reorderAction.error || deleteAction.error}
        </p>
      ) : null}
    </li>
  );
}

/** Plain-language summary of what this channel charges, with a worked example. */
function PriceSummary({
  channel,
  basePrice,
  currency,
}: {
  channel: BookingChannel;
  basePrice: number | null;
  currency: string;
}) {
  if (channel.price_mode === "none") return <>Link only — no price shown</>;

  if (channel.price_mode === "fixed") {
    return channel.fixed_nightly !== null ? (
      <>{money(channel.fixed_nightly, currency)} / night</>
    ) : (
      <>No price set</>
    );
  }

  if (channel.markup_pct === null) return <>No price set</>;

  const example =
    basePrice !== null
      ? Math.round(basePrice * (1 + channel.markup_pct / 100))
      : null;

  return (
    <>
      {channel.markup_pct}% above your direct price
      {example !== null ? (
        <>
          {" · "}
          {money(basePrice as number, currency)} becomes{" "}
          <span className="tabular">{money(example, currency)}</span>
        </>
      ) : null}
    </>
  );
}

function ChannelForm({
  propertyId,
  channel,
  source,
  currency,
  basePrice,
  onDone,
}: {
  propertyId: string;
  channel?: BookingChannel;
  source?: CalendarSource | null;
  currency: string;
  basePrice: number | null;
  onDone: () => void;
}) {
  const addAction = useSaveAction(addBookingChannel);
  const editAction = useSaveAction(updateBookingChannel);
  const action = channel ? editAction : addAction;

  const [name, setName] = useState(channel?.name ?? "");
  const [mode, setMode] = useState<ChannelPriceMode>(channel?.price_mode ?? "markup");
  const [markup, setMarkup] = useState(
    channel?.markup_pct !== null && channel?.markup_pct !== undefined
      ? String(channel.markup_pct)
      : "15",
  );
  const [rating, setRating] = useState(channel?.rating != null ? String(channel.rating) : "");
  const [reviewCount, setReviewCount] = useState(
    channel?.review_count != null ? String(channel.review_count) : "",
  );

  const markupNum = Number(markup);
  const preview =
    mode === "markup" && basePrice !== null && Number.isFinite(markupNum)
      ? Math.round(basePrice * (1 + markupNum / 100))
      : null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const ok = channel
          ? await editAction.runAndWait(propertyId, channel.id, formData)
          : await addAction.runAndWait(propertyId, formData);
        if (ok) onDone();
      }}
      className="border-border space-y-5 rounded-lg border p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="channel_name">Platform name</Label>
        <Input
          id="channel_name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. MakeMyTrip"
          className="h-11"
        />
        {!channel ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setName(p)}
                className="border-border hover:bg-surface-subtle pressable flex h-8 items-center rounded-full border px-3 text-sm"
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel_url">Booking link</Label>
        <Input
          id="channel_url"
          name="booking_url"
          type="url"
          defaultValue={channel?.booking_url ?? ""}
          placeholder="https://..."
          className="h-11"
        />
        <p className="text-text-muted text-xs">
          Where this platform&apos;s listing lives. Guests tap through to it.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">What guests pay there</legend>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["markup", "% above direct"],
              ["fixed", "Fixed price"],
              ["none", "Don't show a price"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`pressable flex h-10 items-center rounded-md border px-3 text-sm font-medium ${
                mode === value
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border hover:bg-surface-subtle"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="price_mode" value={mode} />

        {mode === "markup" ? (
          <div className="space-y-2 pt-2">
            <Label htmlFor="channel_markup">Percent above your direct price</Label>
            <div className="flex items-center gap-2">
              <Input
                id="channel_markup"
                name="markup_pct"
                type="number"
                min={0}
                max={500}
                step="0.1"
                inputMode="decimal"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="h-11 max-w-32"
              />
              <span className="text-text-muted text-sm">%</span>
            </div>
            <p className="text-text-muted text-xs">
              {preview !== null ? (
                <>
                  Your {money(basePrice as number, currency)} night shows as{" "}
                  <span className="tabular font-medium">{money(preview, currency)}</span>{" "}
                  there. This tracks your direct price automatically, including price
                  periods.
                </>
              ) : (
                <>Set a direct price first to preview this.</>
              )}
            </p>
          </div>
        ) : null}

        {mode === "fixed" ? (
          <div className="space-y-2 pt-2">
            <Label htmlFor="channel_fixed">Their nightly price</Label>
            <Input
              id="channel_fixed"
              name="fixed_nightly"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={channel?.fixed_nightly ?? ""}
              className="h-11 max-w-40"
            />
            <p className="text-text-muted text-xs">
              A flat rate, ignored by your price periods. Use the percentage instead if
              their price follows yours.
            </p>
          </div>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label>Rating shown on the Deoghar BnB homepage (optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            name="rating"
            type="number"
            min={0}
            max={5}
            step="0.1"
            inputMode="decimal"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="4.9"
            className="h-11 max-w-24"
            aria-label="Rating out of 5"
          />
          <span className="text-text-muted text-sm">out of 5,</span>
          <Input
            name="review_count"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value)}
            placeholder="32"
            className="h-11 max-w-24"
            aria-label="Number of reviews"
          />
          <span className="text-text-muted text-sm">reviews</span>
        </div>
        <p className="text-text-muted text-xs">
          Typed in by you from the {name || "platform"} listing — we don&apos;t fetch this
          automatically. Shows as &ldquo;Also on {name || "Airbnb"} · ★ 4.9 (32 reviews)&rdquo; on
          the homes grid at deogharbnb.space. Leave both blank to hide the line.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel_ical">Calendar sync link (optional)</Label>
        <Input
          id="channel_ical"
          name="ical_url"
          type="url"
          defaultValue={source?.ical_url ?? ""}
          placeholder="https://...ics"
          className="h-11"
        />
        <p className="text-text-muted text-xs">
          The platform&apos;s iCal export URL. Bookings made there will block those dates
          here automatically. Leave blank if it doesn&apos;t offer one.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={action.pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
        >
          {action.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {channel ? "Save changes" : "Add platform"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="hover:bg-surface-subtle pressable flex h-11 items-center rounded-md px-4 font-medium"
        >
          Cancel
        </button>
        {action.error ? (
          <span role="alert" className="text-danger text-sm">
            {action.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
