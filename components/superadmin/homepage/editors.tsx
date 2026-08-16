"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { RepeatableList } from "@/components/admin/homepage/repeatable-list";
import { PlatformMediaPicker } from "@/components/superadmin/homepage/platform-media-picker";
import type { PlatformEditorProps, PlatformEditorRegistry } from "@/components/superadmin/homepage/platform-shell";
import {
  platformSectionSchemas,
  type PlatformSectionContent,
  type PlatformSectionKey,
} from "@/lib/platform-sections-schema";

/**
 * One editor per apex section, same shape as
 * components/admin/homepage/builtin-editors.tsx: parse the row's raw content
 * against its own zod schema (falling back to the schema's own defaults on a
 * bad parse), hold it as local form state, submit the whole object on save —
 * content is authoritative, so there's no partial-save path.
 */

function parse<K extends PlatformSectionKey>(key: K, content: unknown): PlatformSectionContent<K> {
  const result = platformSectionSchemas[key].safeParse(content);
  return (result.success ? result.data : platformSectionSchemas[key].parse({})) as PlatformSectionContent<K>;
}

/* ------------------------------------------------------------------ hero */

export function HeroEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("hero", content);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [headingHi, setHeadingHi] = useState(c.headingHi);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);
  const [ctaLabelHi, setCtaLabelHi] = useState(c.ctaLabelHi);
  const [ctaLabel, setCtaLabel] = useState(c.ctaLabel);
  const [waCtaLabel, setWaCtaLabel] = useState(c.waCtaLabel);
  const [imageId, setImageId] = useState<string | null>(c.imageId);
  const [trustItems, setTrustItems] = useState(c.trustItems.map((label) => ({ label })));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          eyebrow,
          headingHi,
          heading,
          lede,
          ctaLabelHi,
          ctaLabel,
          waCtaLabel,
          imageId,
          trustItems: trustItems.map((t) => t.label).filter((v) => v.trim()),
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="hero-eyebrow">Eyebrow</Label>
          <Input id="hero-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hero-headinghi">Heading (Hindi)</Label>
          <Input id="hero-headinghi" value={headingHi} onChange={(e) => setHeadingHi(e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="hero-heading">Heading (English)</Label>
        <Input id="hero-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="hero-lede">Sub-heading</Label>
        <Textarea id="hero-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={2} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="hero-ctahi">Button label (Hindi)</Label>
          <Input id="hero-ctahi" value={ctaLabelHi} onChange={(e) => setCtaLabelHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hero-cta">Button label (English)</Label>
          <Input id="hero-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="hero-wacta">WhatsApp button label</Label>
        <Input id="hero-wacta" value={waCtaLabel} onChange={(e) => setWaCtaLabel(e.target.value)} className="h-10" />
      </div>

      <PlatformMediaPicker
        value={imageId}
        onChange={setImageId}
        label="Background photo"
        hint="Falls back to a warm gradient with no photo uploaded."
      />

      <div>
        <p className="mb-2 text-sm font-medium">Trust items under the buttons</p>
        <RepeatableList
          items={trustItems}
          onChange={setTrustItems}
          newItem={() => ({ label: "" })}
          addLabel="Add item"
          itemLabel="item"
          renderItem={(item, i, patch) => (
            <Input
              value={item.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder="Free cancellation"
              aria-label={`Trust item ${i + 1}`}
              className="h-9 text-sm"
            />
          )}
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ----------------------------------------------------------------- homes */

export function HomesEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("homes", content);
  const [eyebrowHi, setEyebrowHi] = useState(c.eyebrowHi);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [lede, setLede] = useState(c.lede);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ eyebrowHi, eyebrow, lede });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="homes-eyebrowhi">Eyebrow (Hindi)</Label>
          <Input id="homes-eyebrowhi" value={eyebrowHi} onChange={(e) => setEyebrowHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="homes-eyebrow">Eyebrow (English)</Label>
          <Input id="homes-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="homes-lede">Sub-heading</Label>
        <Textarea id="homes-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={2} />
      </div>
      <p className="text-text-muted text-xs">
        The property cards below this text are pulled live from published listings — not editable here.
      </p>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* --------------------------------------------------------------- savings */

export function SavingsEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("savings", content);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ heading, lede });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="savings-heading">Heading</Label>
        <Input id="savings-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="savings-lede">Sub-heading</Label>
        <Textarea id="savings-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={3} />
      </div>
      <p className="text-text-muted text-xs">
        The calculator itself uses live rates from published listings — not editable here.
      </p>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* -------------------------------------------------------------- location */

const LOCATION_ICON_OPTIONS = [
  { value: "landmark" as const, label: "Landmark" },
  { value: "train" as const, label: "Train" },
  { value: "plane" as const, label: "Plane" },
  { value: "car" as const, label: "Car" },
];

export function LocationEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("location", content);
  const [eyebrowHi, setEyebrowHi] = useState(c.eyebrowHi);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [promiseBefore, setPromiseBefore] = useState(c.promiseBefore);
  const [promiseAfter, setPromiseAfter] = useState(c.promiseAfter);
  const [items, setItems] = useState(c.items);
  const [footNote, setFootNote] = useState(c.footNote);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          eyebrowHi,
          eyebrow,
          promiseBefore,
          promiseAfter,
          items: items.filter((i) => i.label.trim() && i.range.trim()),
          footNote,
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="location-eyebrowhi">Eyebrow (Hindi)</Label>
          <Input id="location-eyebrowhi" value={eyebrowHi} onChange={(e) => setEyebrowHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="location-eyebrow">Eyebrow (English)</Label>
          <Input id="location-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="location-before">Promise sentence — before the walk-time number</Label>
        <Input id="location-before" value={promiseBefore} onChange={(e) => setPromiseBefore(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="location-after">Promise sentence — after the walk-time number</Label>
        <Input id="location-after" value={promiseAfter} onChange={(e) => setPromiseAfter(e.target.value)} className="h-10" />
        <p className="text-text-muted text-xs">
          The number itself (e.g. &quot;15-minute walk&quot;) is computed live from published listings and sits
          between these two fields — it can&apos;t be edited here.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Landmark tiles</p>
        <RepeatableList
          items={items}
          onChange={setItems}
          newItem={() => ({ label: "", range: "", note: "", icon: "landmark" as const })}
          addLabel="Add landmark"
          itemLabel="landmark"
          renderItem={(item, i, patch) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={item.label}
                  onChange={(e) => patch({ label: e.target.value })}
                  placeholder="Baba Baidyanath Dham"
                  aria-label={`Landmark ${i + 1} name`}
                  className="h-9 text-sm"
                  required
                />
                <Input
                  value={item.range}
                  onChange={(e) => patch({ range: e.target.value })}
                  placeholder="5–25 min walk"
                  aria-label={`Landmark ${i + 1} distance`}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <Input
                value={item.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="Short note"
                aria-label={`Landmark ${i + 1} note`}
                className="h-9 text-sm"
              />
              <select
                value={item.icon}
                onChange={(e) => patch({ icon: e.target.value as typeof item.icon })}
                aria-label={`Landmark ${i + 1} icon`}
                className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                {LOCATION_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="location-footnote">Footnote</Label>
        <Input id="location-footnote" value={footNote} onChange={(e) => setFootNote(e.target.value)} className="h-10" />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------ comparison */

export function ComparisonEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("comparison", content);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);
  const [rows, setRows] = useState(c.rows);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ heading, lede, rows: rows.filter((r) => r.label.trim()) });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="comparison-heading">Heading</Label>
        <Input id="comparison-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="comparison-lede">Sub-heading</Label>
        <Textarea id="comparison-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={2} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Table rows</p>
        <p className="text-text-muted mb-2 text-xs">
          Be honest about where a dharamshala genuinely wins (usually price) — visible fairness is more persuasive
          to this audience than a table that only ever favours you.
        </p>
        <RepeatableList
          items={rows}
          onChange={setRows}
          newItem={() => ({ label: "", us: "", hotel: "", dharamshala: "" })}
          addLabel="Add row"
          itemLabel="row"
          maxItems={12}
          renderItem={(item, i, patch) => (
            <div className="grid gap-2 sm:grid-cols-4">
              <Input
                value={item.label}
                onChange={(e) => patch({ label: e.target.value })}
                placeholder="Feature"
                aria-label={`Row ${i + 1} label`}
                className="h-9 text-sm"
                required
              />
              <Input
                value={item.us}
                onChange={(e) => patch({ us: e.target.value })}
                placeholder="Us"
                aria-label={`Row ${i + 1} — us`}
                className="h-9 text-sm"
              />
              <Input
                value={item.hotel}
                onChange={(e) => patch({ hotel: e.target.value })}
                placeholder="Typical hotel"
                aria-label={`Row ${i + 1} — hotel`}
                className="h-9 text-sm"
              />
              <Input
                value={item.dharamshala}
                onChange={(e) => patch({ dharamshala: e.target.value })}
                placeholder="Dharamshala"
                aria-label={`Row ${i + 1} — dharamshala`}
                className="h-9 text-sm"
              />
            </div>
          )}
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* -------------------------------------------------------- what we arrange */

const ARRANGE_ICON_OPTIONS = [
  { value: "flame" as const, label: "Flame (pooja)" },
  { value: "car" as const, label: "Car (pickup)" },
  { value: "car-front" as const, label: "Car with driver" },
  { value: "utensils" as const, label: "Food" },
];

export function WhatWeArrangeEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("what_we_arrange", content);
  const [eyebrowHi, setEyebrowHi] = useState(c.eyebrowHi);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [items, setItems] = useState(c.items);
  const [footNote, setFootNote] = useState(c.footNote);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          eyebrowHi,
          eyebrow,
          items: items.filter((i) => i.title.trim()),
          footNote,
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="arrange-eyebrowhi">Eyebrow (Hindi)</Label>
          <Input id="arrange-eyebrowhi" value={eyebrowHi} onChange={(e) => setEyebrowHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="arrange-eyebrow">Eyebrow (English)</Label>
          <Input id="arrange-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Items</p>
        <RepeatableList
          items={items}
          onChange={setItems}
          newItem={() => ({ icon: "flame" as const, title: "", body: "" })}
          addLabel="Add item"
          itemLabel="item"
          maxItems={6}
          renderItem={(item, i, patch) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                <select
                  value={item.icon}
                  onChange={(e) => patch({ icon: e.target.value as typeof item.icon })}
                  aria-label={`Item ${i + 1} icon`}
                  className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
                >
                  {ARRANGE_ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={item.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Airport & station pickup"
                  aria-label={`Item ${i + 1} title`}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <Textarea
                value={item.body}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder="Description"
                aria-label={`Item ${i + 1} description`}
                rows={2}
              />
            </div>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="arrange-footnote">Footnote</Label>
        <Input id="arrange-footnote" value={footNote} onChange={(e) => setFootNote(e.target.value)} className="h-10" />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* -------------------------------------------------------------- reviews */

export function SocialProofEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("social_proof", content);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [reviews, setReviews] = useState(c.reviews);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ eyebrow, reviews: reviews.filter((r) => r.name.trim() && r.quote.trim()) });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="proof-eyebrow">Eyebrow</Label>
        <Input id="proof-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
      </div>

      <p className="text-text-muted text-xs">
        This whole section disappears from the page if every review below is removed.
      </p>

      <RepeatableList
        items={reviews}
        onChange={setReviews}
        newItem={() => ({ name: "", quote: "", stars: 5 })}
        addLabel="Add review"
        itemLabel="review"
        renderItem={(item, i, patch) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
              <Input
                value={item.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Name"
                aria-label={`Review ${i + 1} name`}
                className="h-9 text-sm"
                required
              />
              <select
                value={item.stars}
                onChange={(e) => patch({ stars: Number(e.target.value) })}
                aria-label={`Review ${i + 1} star rating`}
                className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              value={item.quote}
              onChange={(e) => patch({ quote: e.target.value })}
              placeholder="Quote"
              aria-label={`Review ${i + 1} quote`}
              rows={3}
              required
            />
          </div>
        )}
      />

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* -------------------------------------------------------------- host band */

const HOST_BAND_ICON_OPTIONS = [
  { value: "template" as const, label: "Branded page" },
  { value: "chat" as const, label: "Support / chat" },
  { value: "money" as const, label: "Direct payment" },
];

export function HostBandEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("host_band", content);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [heading, setHeading] = useState(c.heading);
  const [body, setBody] = useState(c.body);
  const [proofPoints, setProofPoints] = useState(c.proofPoints);
  const [ctaLabel, setCtaLabel] = useState(c.ctaLabel);
  const [ctaWaMessage, setCtaWaMessage] = useState(c.ctaWaMessage);
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState(c.secondaryCtaLabel);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          eyebrow,
          heading,
          body,
          proofPoints: proofPoints.filter((p) => p.label.trim()),
          ctaLabel,
          ctaWaMessage,
          secondaryCtaLabel,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="hostband-eyebrow">Eyebrow</Label>
        <Input id="hostband-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hostband-heading">Heading</Label>
        <Input id="hostband-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hostband-body">Body</Label>
        <Textarea id="hostband-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        <p className="text-text-muted text-xs">
          Leave a blank line between paragraphs — each becomes its own paragraph on the page.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Proof points</p>
        <RepeatableList
          items={proofPoints}
          onChange={setProofPoints}
          newItem={() => ({ icon: "template" as const, label: "" })}
          addLabel="Add point"
          itemLabel="point"
          maxItems={4}
          renderItem={(item, i, patch) => (
            <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <select
                value={item.icon}
                onChange={(e) => patch({ icon: e.target.value as typeof item.icon })}
                aria-label={`Point ${i + 1} icon`}
                className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                {HOST_BAND_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Input
                value={item.label}
                onChange={(e) => patch({ label: e.target.value })}
                placeholder="Your own branded booking page"
                aria-label={`Point ${i + 1} label`}
                className="h-9 text-sm"
                required
              />
            </div>
          )}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="hostband-cta">Primary button label</Label>
          <Input id="hostband-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hostband-secondary">Secondary button label</Label>
          <Input
            id="hostband-secondary"
            value={secondaryCtaLabel}
            onChange={(e) => setSecondaryCtaLabel(e.target.value)}
            className="h-10"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="hostband-wamsg">Prefilled WhatsApp message (primary button)</Label>
        <Textarea
          id="hostband-wamsg"
          value={ctaWaMessage}
          onChange={(e) => setCtaWaMessage(e.target.value)}
          rows={2}
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------------- faq */

export function FaqEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("faq", content);
  const [heading, setHeading] = useState(c.heading);
  const [items, setItems] = useState(c.items);
  const [footNote, setFootNote] = useState(c.footNote);
  const [waLabel, setWaLabel] = useState(c.waLabel);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          heading,
          items: items.filter((i) => i.q.trim() && i.a.trim()),
          footNote,
          waLabel,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="faq-heading">Heading</Label>
        <Input id="faq-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Questions</p>
        <p className="text-text-muted mb-2 text-xs">
          Also feeds the page&apos;s FAQPage structured data, so questions and answers here are what search engines
          and AI assistants read too — not just what&apos;s visible.
        </p>
        <RepeatableList
          items={items}
          onChange={setItems}
          newItem={() => ({ q: "", a: "", comparison: false })}
          addLabel="Add question"
          itemLabel="question"
          renderItem={(item, i, patch) => (
            <div className="space-y-2">
              <Input
                value={item.q}
                onChange={(e) => patch({ q: e.target.value })}
                placeholder="Question"
                aria-label={`Question ${i + 1}`}
                className="h-9 text-sm"
                required
              />
              <Textarea
                value={item.a}
                onChange={(e) => patch({ a: e.target.value })}
                placeholder="Answer"
                aria-label={`Answer ${i + 1}`}
                rows={2}
                required
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={item.comparison}
                  onChange={(e) => patch({ comparison: e.target.checked })}
                  className="size-4"
                />
                Style this answer as the comparison question
              </label>
            </div>
          )}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="faq-footnote">Line before the WhatsApp button</Label>
          <Input id="faq-footnote" value={footNote} onChange={(e) => setFootNote(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="faq-walabel">WhatsApp button label</Label>
          <Input id="faq-walabel" value={waLabel} onChange={(e) => setWaLabel(e.target.value)} className="h-10" />
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------- final cta */

export function FinalCtaEditor({ content, onSave, pending, error, saved }: PlatformEditorProps) {
  const c = parse("final_cta", content);
  const [headingHi, setHeadingHi] = useState(c.headingHi);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState(c.primaryCtaLabel);
  const [waCtaLabel, setWaCtaLabel] = useState(c.waCtaLabel);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ headingHi, heading, lede, primaryCtaLabel, waCtaLabel });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="finalcta-headinghi">Heading (Hindi)</Label>
          <Input id="finalcta-headinghi" value={headingHi} onChange={(e) => setHeadingHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="finalcta-heading">Heading (English)</Label>
          <Input id="finalcta-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="finalcta-lede">Sub-heading</Label>
        <Textarea id="finalcta-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={2} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="finalcta-primary">Primary button label</Label>
          <Input
            id="finalcta-primary"
            value={primaryCtaLabel}
            onChange={(e) => setPrimaryCtaLabel(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="finalcta-wa">WhatsApp button label</Label>
          <Input id="finalcta-wa" value={waCtaLabel} onChange={(e) => setWaCtaLabel(e.target.value)} className="h-10" />
        </div>
      </div>
      <p className="text-text-muted text-xs">
        The property cards below this text are pulled live from published listings — not editable here.
      </p>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* --------------------------------------------------------------- registry */

export const PLATFORM_SECTION_EDITORS: PlatformEditorRegistry = {
  hero: HeroEditor,
  homes: HomesEditor,
  savings: SavingsEditor,
  location: LocationEditor,
  comparison: ComparisonEditor,
  what_we_arrange: WhatWeArrangeEditor,
  social_proof: SocialProofEditor,
  host_band: HostBandEditor,
  faq: FaqEditor,
  final_cta: FinalCtaEditor,
};
