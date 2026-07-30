"use client";

import { useState } from "react";

import { Check, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { MediaPicker } from "@/components/admin/homepage/media-picker";
import { RepeatableList } from "@/components/admin/homepage/repeatable-list";
import { useMediaLibrary } from "@/components/admin/homepage/media-library-context";
import { builtinSchemas, type BuiltinContent, type BuiltinKey } from "@/lib/homepage-blocks";

/**
 * One editor per builtin section. Each parses the row's raw content against
 * its own zod schema (falling back to the schema's own defaults on a bad
 * parse, same as the render path) so the form always starts from a valid
 * shape, and submits the WHOLE section as one object — content is
 * authoritative now, not a sparse override (see plan §1), so there's no
 * partial-save path to get wrong.
 */

export type EditorProps<K extends BuiltinKey> = {
  content: unknown;
  onSave: (content: BuiltinContent<K>) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
};

function parse<K extends BuiltinKey>(key: K, content: unknown): BuiltinContent<K> {
  const result = builtinSchemas[key].safeParse(content);
  return (result.success ? result.data : builtinSchemas[key].parse({})) as BuiltinContent<K>;
}

const FIELD_HINT = "Leave blank to show nothing for this field — there's no code fallback anymore.";

/* ------------------------------------------------------------------ hero */

const HERO_VARIANTS = [
  { src: "shravan" as const, label: "Shravan season traffic" },
  { src: "aiims" as const, label: "AIIMS-targeted traffic" },
  { src: "weekend" as const, label: "Weekend-getaway traffic" },
];

export function HeroEditor({ content, onSave, pending, error, saved }: EditorProps<"hero">) {
  const c = parse("hero", content);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [headingHi, setHeadingHi] = useState(c.headingHi);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);
  const [ctaLabelHi, setCtaLabelHi] = useState(c.ctaLabelHi);
  const [ctaLabel, setCtaLabel] = useState(c.ctaLabel);
  const [imageId, setImageId] = useState<string | null>(c.imageId);
  const [chips, setChips] = useState(c.chips);
  const [variants, setVariants] = useState(() =>
    HERO_VARIANTS.map((v) => c.variants.find((x) => x.src === v.src) ?? { src: v.src, heading: "", lede: "" }),
  );

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
          imageId,
          chips,
          variants: variants.filter((v) => v.heading.trim() && v.lede.trim()),
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
        <Label htmlFor="hero-heading">Heading (English) — supports {"{temple}"}</Label>
        <Input id="hero-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
        <p className="text-text-muted text-xs">
          Shown to direct visitors. Ad traffic with a ?src= link gets its own headline below instead.
        </p>
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

      <MediaPicker value={imageId} onChange={setImageId} label="Background photo" />

      <div>
        <p className="mb-2 text-sm font-medium">Chips under the buttons</p>
        <RepeatableList
          items={chips}
          onChange={setChips}
          newItem={() => ({ label: "" })}
          addLabel="Add chip"
          itemLabel="chip"
          renderItem={(item, i, patch) => (
            <Input
              value={item.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder="Replies in ~{replyMinutes} min"
              aria-label={`Chip ${i + 1}`}
              className="h-9 text-sm"
            />
          )}
        />
      </div>

      <div className="border-border space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Ad-traffic headlines (?src=…)</p>
        <p className="text-text-muted text-xs">
          Shown instead of the heading above when someone arrives from a matching ad. Leave both fields blank to
          fall back to the main heading for that traffic.
        </p>
        {HERO_VARIANTS.map((v, i) => (
          <div key={v.src} className="border-border space-y-2 rounded-md border p-3">
            <p className="text-text-muted text-xs font-medium">{v.label}</p>
            <Input
              value={variants[i].heading}
              onChange={(e) =>
                setVariants((prev) => prev.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))
              }
              placeholder="Heading"
              aria-label={`${v.label} heading`}
              className="h-9 text-sm"
            />
            <Textarea
              value={variants[i].lede}
              onChange={(e) =>
                setVariants((prev) => prev.map((x, j) => (j === i ? { ...x, lede: e.target.value } : x)))
              }
              placeholder="Sub-heading"
              aria-label={`${v.label} sub-heading`}
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* --------------------------------------------------------- trust ribbon */

export function TrustRibbonEditor({ content, onSave, pending, error, saved }: EditorProps<"trust_ribbon">) {
  const c = parse("trust_ribbon", content);
  const [items, setItems] = useState(c.items);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ items: items.filter((i) => i.label.trim()) });
      }}
      className="space-y-4"
    >
      <RepeatableList
        items={items}
        onChange={setItems}
        newItem={() => ({ icon: "check" as const, label: "" })}
        addLabel="Add item"
        itemLabel="item"
        renderItem={(item, i, patch) => (
          <div className="flex gap-2">
            <select
              value={item.icon}
              onChange={(e) => patch({ icon: e.target.value as "check" | "star" })}
              aria-label={`Icon for item ${i + 1}`}
              className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="check">Check</option>
              <option value="star">Star</option>
            </select>
            <Input
              value={item.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder="Free cancellation up to {cancelDays} days"
              aria-label={`Label for item ${i + 1}`}
              className="h-9 flex-1 text-sm"
            />
          </div>
        )}
      />
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------------- map */

export function MapEditor({ content, onSave, pending, error, saved }: EditorProps<"map">) {
  const c = parse("map", content);
  const [heading, setHeading] = useState(c.heading);
  const [sub, setSub] = useState(c.sub);
  const [landmarkImages, setLandmarkImages] = useState<[string | null, string | null, string | null]>(
    c.landmarkImages,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ heading, sub, landmarkImages });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="map-heading">Heading</Label>
        <Input id="map-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="map-sub">Sub-line (over the map image)</Label>
        <Textarea id="map-sub" value={sub} onChange={(e) => setSub(e.target.value)} rows={2} />
      </div>

      <div className="border-border space-y-4 border-t pt-4">
        <p className="text-text-muted text-xs">
          Positional against your property&apos;s Distances rows — photo 1 is the first row, not a specific named
          place. Reordering the Distances rows won&apos;t reorder these photos.
        </p>
        {[0, 1, 2].map((i) => (
          <MediaPicker
            key={i}
            value={landmarkImages[i]}
            onChange={(id) =>
              setLandmarkImages((prev) => {
                const next = [...prev] as typeof prev;
                next[i] = id;
                return next;
              })
            }
            label={`Photo for landmark ${i + 1}`}
          />
        ))}
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ----------------------------------------------------------------- homes */

export function HomesEditor({ content, onSave, pending, error, saved }: EditorProps<"homes">) {
  const c = parse("homes", content);
  const [eyebrowHi, setEyebrowHi] = useState(c.eyebrowHi);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ eyebrowHi, eyebrow, heading, lede });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="homes-eyebrowhi">Eyebrow (Hindi)</Label>
          <Input id="homes-eyebrowhi" value={eyebrowHi} onChange={(e) => setEyebrowHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="homes-eyebrow">Eyebrow</Label>
          <Input id="homes-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="homes-heading">Heading — supports {"{count} {homes} {sleepsRange}"}</Label>
        <Input id="homes-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="homes-lede">Sub-heading</Label>
        <Textarea id="homes-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={2} />
        <p className="text-text-muted text-xs">{FIELD_HINT}</p>
      </div>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ---------------------------------------------------------- why apartment */

export function WhyApartmentEditor({ content, onSave, pending, error, saved }: EditorProps<"why_apartment">) {
  const c = parse("why_apartment", content);
  const [heading, setHeading] = useState(c.heading);
  const [body, setBody] = useState(c.body);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ heading, body });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="why-heading">Heading</Label>
        <Input id="why-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="why-body">Body copy</Label>
        <Textarea id="why-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      </div>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* -------------------------------------------------------------- meet host */

export function MeetHostEditor({ content, onSave, pending, error, saved }: EditorProps<"meet_host">) {
  const c = parse("meet_host", content);
  const [eyebrowHi, setEyebrowHi] = useState(c.eyebrowHi);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [heading, setHeading] = useState(c.heading);
  const [body, setBody] = useState(c.body);
  const [imageId, setImageId] = useState<string | null>(c.imageId);
  const [videoCallTitle, setVideoCallTitle] = useState(c.videoCallTitle);
  const [videoCallBody, setVideoCallBody] = useState(c.videoCallBody);
  const [videoCallCta, setVideoCallCta] = useState(c.videoCallCta);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ eyebrowHi, eyebrow, heading, body, imageId, videoCallTitle, videoCallBody, videoCallCta });
      }}
      className="space-y-4"
    >
      <p className="text-text-muted text-sm">
        This whole section stays hidden on the homepage until you set your name in Settings → Host & booking
        promises.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="host-eyebrowhi">Eyebrow (Hindi)</Label>
          <Input id="host-eyebrowhi" value={eyebrowHi} onChange={(e) => setEyebrowHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="host-eyebrow">Eyebrow</Label>
          <Input id="host-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="host-heading">Heading — supports {"{hostName}"}</Label>
        <Input id="host-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="host-body">Your story — supports {"{hostYears}"}</Label>
        <Textarea id="host-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        <p className="text-text-muted text-xs">
          Leave a blank line between paragraphs. A paragraph whose only content is a missing token (like an unset
          years-in-Deoghar) drops on its own without blanking the rest.
        </p>
      </div>

      <MediaPicker value={imageId} onChange={setImageId} label="Your photo" />

      <div className="border-border space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Video-call offer</p>
        <Input
          value={videoCallTitle}
          onChange={(e) => setVideoCallTitle(e.target.value)}
          placeholder="Want to see a flat before you decide?"
          aria-label="Video call offer title"
          className="h-10"
        />
        <Textarea
          value={videoCallBody}
          onChange={(e) => setVideoCallBody(e.target.value)}
          placeholder="Ask me for a video call on WhatsApp…"
          aria-label="Video call offer body"
          rows={2}
        />
        <Input
          value={videoCallCta}
          onChange={(e) => setVideoCallCta(e.target.value)}
          placeholder="Ask for a video walkthrough"
          aria-label="Video call button label"
          className="h-10"
        />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/**
 * A photo's caption is its title on the shared media-library row, not
 * something the "nothing hidden" section owns — so editing it here writes
 * straight to the library (same as the Photos tab's own card) rather than
 * going through this form's own Save button. That keeps a title one fact in
 * one place: renaming a photo here also renames it everywhere else it's
 * used, instead of drifting into a per-section copy.
 */
function PhotoCaptionField({ imageId }: { imageId: string }) {
  const { pool, updateMeta } = useMediaLibrary();
  const image = pool.find((img) => img.id === imageId);
  const [caption, setCaption] = useState(image?.title ?? "");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!image) return null;
  const dirty = caption !== (image.title ?? "");

  async function save() {
    setPending(true);
    setError(null);
    const result = await updateMeta(image!.id, caption, image!.alt ?? "");
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`caption-${imageId}`} className="text-xs">
        Caption (shown under this photo)
      </Label>
      <div className="flex gap-2">
        <Input
          id={`caption-${imageId}`}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="The bathroom, lights on"
          className="h-9 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="border-border hover:bg-surface-subtle pressable flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : saved ? (
            <Check className="size-3" aria-hidden="true" />
          ) : null}
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- nothing hidden */

export function NothingHiddenEditor({ content, onSave, pending, error, saved }: EditorProps<"nothing_hidden">) {
  const c = parse("nothing_hidden", content);
  const [heading, setHeading] = useState(c.heading);
  const [lede, setLede] = useState(c.lede);
  const [footNote, setFootNote] = useState(c.footNote);
  const [photos, setPhotos] = useState(c.photos);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ heading, lede, footNote, photos: photos.filter((p) => p.imageId) });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="nh-heading">Heading</Label>
        <Input id="nh-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nh-lede">Sub-heading</Label>
        <Textarea id="nh-lede" value={lede} onChange={(e) => setLede(e.target.value)} rows={2} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Photos — as many as you want</p>
        <p className="text-text-muted mb-2 text-xs">
          The first photo runs larger than the rest. The whole section hides itself if every photo here is removed.
        </p>
        <RepeatableList
          items={photos}
          onChange={setPhotos}
          newItem={() => ({ imageId: "" })}
          addLabel="Add photo"
          itemLabel="photo"
          renderItem={(item, i, patch) => (
            <div className="space-y-3">
              <MediaPicker
                value={item.imageId || null}
                onChange={(id) => patch({ imageId: id ?? "" })}
                label={`Photo ${i + 1}`}
              />
              {item.imageId ? <PhotoCaptionField imageId={item.imageId} /> : null}
            </div>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="nh-foot">Closing line (before the &quot;See the homes&quot; link)</Label>
        <Input id="nh-foot" value={footNote} onChange={(e) => setFootNote(e.target.value)} className="h-10" />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ---------------------------------------------------------------- proof */

const STAR_OPTIONS = [1, 2, 3, 4, 5];

export function ProofEditor({ content, onSave, pending, error, saved }: EditorProps<"proof">) {
  const c = parse("proof", content);
  const [heading, setHeading] = useState(c.heading);
  const [stats, setStats] = useState(c.stats);
  const [reviews, setReviews] = useState(c.reviews);
  const [carousel, setCarousel] = useState(c.carousel);

  function numOrNull(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ heading, stats, reviews: reviews.filter((r) => r.name.trim() && r.quote.trim()), carousel });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="proof-heading">Heading</Label>
        <Input id="proof-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>

      <div className="border-border space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Summary numbers</p>
        <p className="text-text-muted text-xs">
          Only put a real, checkable number here. The Google rating only shows once you have 10+ reviews — below
          that a low-looking count converts worse than no count at all.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="proof-grating" className="text-xs">
              Google rating (out of 5)
            </Label>
            <Input
              id="proof-grating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={stats.googleRating ?? ""}
              onChange={(e) => setStats((s) => ({ ...s, googleRating: numOrNull(e.target.value) }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proof-gcount" className="text-xs">
              Google review count
            </Label>
            <Input
              id="proof-gcount"
              type="number"
              min={0}
              value={stats.googleCount}
              onChange={(e) => setStats((s) => ({ ...s, googleCount: Number(e.target.value) || 0 }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="proof-gurl" className="text-xs">
              Link to all Google reviews
            </Label>
            <Input
              id="proof-gurl"
              type="url"
              value={stats.googleReviewUrl}
              onChange={(e) => setStats((s) => ({ ...s, googleReviewUrl: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proof-mmt" className="text-xs">
              MakeMyTrip rating
            </Label>
            <Input
              id="proof-mmt"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={stats.mmtRating ?? ""}
              onChange={(e) => setStats((s) => ({ ...s, mmtRating: numOrNull(e.target.value) }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proof-families" className="text-xs">
              Families hosted
            </Label>
            <Input
              id="proof-families"
              type="number"
              min={0}
              value={stats.familiesHosted ?? ""}
              onChange={(e) => setStats((s) => ({ ...s, familiesHosted: numOrNull(e.target.value) }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proof-year" className="text-xs">
              Hosting since (year)
            </Label>
            <Input
              id="proof-year"
              value={stats.yearStarted}
              onChange={(e) => setStats((s) => ({ ...s, yearStarted: e.target.value }))}
              placeholder="2019"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proof-repeat" className="text-xs">
              Repeat guests (%)
            </Label>
            <Input
              id="proof-repeat"
              type="number"
              min={0}
              max={100}
              value={stats.repeatPct ?? ""}
              onChange={(e) => setStats((s) => ({ ...s, repeatPct: numOrNull(e.target.value) }))}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Review cards</p>
        <RepeatableList
          items={reviews}
          onChange={setReviews}
          newItem={() => ({ name: "", city: "", stars: 5, quote: "", reply: "", imageId: null })}
          addLabel="Add review"
          itemLabel="review"
          renderItem={(item, i, patch) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={item.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Guest name"
                  aria-label={`Review ${i + 1} name`}
                  className="h-9 text-sm"
                  required
                />
                <Input
                  value={item.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  placeholder="City (optional)"
                  aria-label={`Review ${i + 1} city`}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`review-stars-${i}`} className="text-xs">
                  Stars
                </Label>
                <select
                  id={`review-stars-${i}`}
                  value={item.stars}
                  onChange={(e) => patch({ stars: Number(e.target.value) })}
                  className="border-border h-9 rounded-md border bg-transparent px-2 text-sm"
                >
                  {STAR_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea
                value={item.quote}
                onChange={(e) => patch({ quote: e.target.value })}
                placeholder="What they said, in their own words"
                aria-label={`Review ${i + 1} quote`}
                rows={2}
                required
              />
              <Textarea
                value={item.reply ?? ""}
                onChange={(e) => patch({ reply: e.target.value })}
                placeholder="Your public reply (optional) — proof someone's actually listening"
                aria-label={`Review ${i + 1} reply`}
                rows={2}
              />
              <MediaPicker
                value={item.imageId ?? null}
                onChange={(id) => patch({ imageId: id })}
                label="Guest photo (optional)"
              />
            </div>
          )}
        />
      </div>

      <div className="border-border space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Carousel</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={carousel.enabled}
            onChange={(e) => setCarousel((s) => ({ ...s, enabled: e.target.checked }))}
            className="size-4"
          />
          Auto-scroll (always off for visitors who&apos;ve asked for reduced motion, and needs 3+ reviews)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={carousel.pauseOnHover}
            onChange={(e) => setCarousel((s) => ({ ...s, pauseOnHover: e.target.checked }))}
            className="size-4"
          />
          Pause while hovered or focused
        </label>
        <div className="max-w-[180px] space-y-1">
          <Label htmlFor="carousel-speed" className="text-xs">
            Loop speed (seconds — higher is slower)
          </Label>
          <Input
            id="carousel-speed"
            type="number"
            min={10}
            max={120}
            value={carousel.speedSeconds}
            onChange={(e) => setCarousel((s) => ({ ...s, speedSeconds: Number(e.target.value) || 40 }))}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------------ services */

export function ServicesEditor({ content, onSave, pending, error, saved }: EditorProps<"services">) {
  const c = parse("services", content);
  const [note, setNote] = useState(c.note);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ note });
      }}
      className="space-y-4"
    >
      <p className="text-text-muted text-sm">
        The add-ons themselves — airport pickup, pooja booking, and so on — come from your add-on catalogue in
        Settings. Only this closing line is editable here.
      </p>
      <div className="space-y-1">
        <Label htmlFor="services-note">Closing line</Label>
        <Textarea id="services-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* -------------------------------------------------------------------- shravan */

export function ShravanEditor({ content, onSave, pending, error, saved }: EditorProps<"shravan">) {
  const c = parse("shravan", content);
  const [eyebrow, setEyebrow] = useState(c.eyebrow);
  const [heading, setHeading] = useState(c.heading);
  const [body, setBody] = useState(c.body);
  const [promise, setPromise] = useState(c.promise);
  const [ctaLabel, setCtaLabel] = useState(c.ctaLabel);
  const [freeUnits, setFreeUnits] = useState(c.freeUnits === null ? "" : String(c.freeUnits));
  const [lastUpdated, setLastUpdated] = useState(c.lastUpdated ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          eyebrow,
          heading,
          body,
          promise,
          ctaLabel,
          freeUnits: freeUnits.trim() ? Number(freeUnits) : null,
          lastUpdated: lastUpdated.trim() || null,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="shravan-eyebrow">Eyebrow</Label>
        <Input id="shravan-eyebrow" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shravan-heading">Heading</Label>
        <Input id="shravan-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shravan-body">Paragraph</Label>
        <Textarea id="shravan-body" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shravan-promise">Emphasised line — supports {"{advancePct}"}</Label>
        <Textarea id="shravan-promise" value={promise} onChange={(e) => setPromise(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shravan-cta">Button label</Label>
        <Input id="shravan-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="h-10" />
      </div>

      <div className="border-border grid gap-3 border-t pt-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="shravan-free">Homes still free (leave blank to hide the pill)</Label>
          <Input
            id="shravan-free"
            type="number"
            min={0}
            value={freeUnits}
            onChange={(e) => setFreeUnits(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="shravan-updated">Last updated</Label>
          <Input
            id="shravan-updated"
            type="date"
            value={lastUpdated}
            onChange={(e) => setLastUpdated(e.target.value)}
            className="h-10"
          />
        </div>
      </div>
      <p className="text-text-muted text-xs">
        Both fields blank hides the availability pill entirely — never guess this number, it&apos;s the one claim
        on the page a returning visitor can catch you faking.
      </p>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ----------------------------------------------------------------------- faq */

export function FaqEditor({ content, onSave, pending, error, saved }: EditorProps<"faq">) {
  const c = parse("faq", content);
  const [heading, setHeading] = useState(c.heading);
  const [items, setItems] = useState(c.items);
  const [comparisonRows, setComparisonRows] = useState(c.comparisonRows);
  const [closingLine, setClosingLine] = useState(c.closingLine);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          heading,
          items: items.filter((i) => i.q.trim() && i.a.trim()),
          comparisonRows: comparisonRows.filter((r) => r.label.trim()),
          closingLine,
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
          Tick &quot;Show comparison table&quot; on at most one question — its answer is where the table renders.
          Answers support {"{cancelDays} {advancePct} {templeLabel} {templeDistance} {sleepsMax}"}; a question whose
          only token is missing (no anchor landmark set yet, say) drops itself rather than showing a broken
          sentence.
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
                Show comparison table under this answer
              </label>
            </div>
          )}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Comparison table rows</p>
        <p className="text-text-muted mb-2 text-xs">
          Be honest about where a dharamshala genuinely wins (usually price) — visible fairness is more persuasive
          to this audience than a table that only ever favours you.
        </p>
        <RepeatableList
          items={comparisonRows}
          onChange={setComparisonRows}
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
                required
              />
              <Input
                value={item.hotel}
                onChange={(e) => patch({ hotel: e.target.value })}
                placeholder="Typical hotel"
                aria-label={`Row ${i + 1} — hotel`}
                className="h-9 text-sm"
                required
              />
              <Input
                value={item.dharamshala}
                onChange={(e) => patch({ dharamshala: e.target.value })}
                placeholder="Dharamshala"
                aria-label={`Row ${i + 1} — dharamshala`}
                className="h-9 text-sm"
                required
              />
            </div>
          )}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="faq-closing">Line before the WhatsApp button</Label>
        <Input id="faq-closing" value={closingLine} onChange={(e) => setClosingLine(e.target.value)} className="h-10" />
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* --------------------------------------------------------------------- close */

export function CloseEditor({ content, onSave, pending, error, saved }: EditorProps<"close">) {
  const c = parse("close", content);
  const [headingHi, setHeadingHi] = useState(c.headingHi);
  const [heading, setHeading] = useState(c.heading);
  const [body, setBody] = useState(c.body);
  const [ctaLabel, setCtaLabel] = useState(c.ctaLabel);
  const [shareHeadingHi, setShareHeadingHi] = useState(c.shareHeadingHi);
  const [shareBody, setShareBody] = useState(c.shareBody);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ headingHi, heading, body, ctaLabel, shareHeadingHi, shareBody });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="close-headinghi">Heading (Hindi)</Label>
          <Input id="close-headinghi" value={headingHi} onChange={(e) => setHeadingHi(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="close-heading">Heading (English)</Label>
          <Input id="close-heading" value={heading} onChange={(e) => setHeading(e.target.value)} className="h-10" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="close-body">Body copy</Label>
        <Textarea id="close-body" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="close-cta">Button label</Label>
        <Input id="close-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="h-10" />
      </div>

      <div className="border-border space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Share-with-family card</p>
        <Input
          value={shareHeadingHi}
          onChange={(e) => setShareHeadingHi(e.target.value)}
          placeholder="परिवार से पूछना है?"
          aria-label="Share card heading"
          className="h-10"
        />
        <Textarea
          value={shareBody}
          onChange={(e) => setShareBody(e.target.value)}
          placeholder="Send this page to your family group…"
          aria-label="Share card body"
          rows={2}
        />
        <p className="text-text-muted text-xs">Leave both blank to remove this card from the page.</p>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}
