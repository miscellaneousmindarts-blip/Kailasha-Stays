"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { ImagePicker, type ImageChoice } from "@/components/admin/homepage/image-picker";
import type { LayoutType } from "@/lib/homepage-blocks";

/**
 * Editors for admin-composed sections.
 *
 * Each keeps its whole draft in one piece of local state and submits it as a
 * single object, so a half-typed section is never persisted — the server
 * re-validates against the same zod schema and rejects anything incomplete
 * with the offending field named.
 */

type EditorProps = {
  content: Record<string, unknown>;
  pool: ImageChoice[];
  onSave: (content: unknown) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
};

const BANDS = [
  { value: "canvas", label: "White" },
  { value: "sand", label: "Sand" },
  { value: "ink", label: "Dark" },
] as const;

function BandSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>Background</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border h-10 w-full rounded-md border bg-transparent px-3 text-sm"
      >
        {BANDS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      <p className="text-text-muted text-xs">
        Alternate this with the sections above and below so the page has rhythm.
      </p>
    </div>
  );
}

function str(content: Record<string, unknown>, key: string, fallback = ""): string {
  const v = content[key];
  return typeof v === "string" ? v : fallback;
}

/** A repeating list of short strings, e.g. the bullets on a split section. */
function StringList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="h-10"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove item ${i + 1}`}
            className="text-danger hover:bg-danger/10 pressable flex size-10 shrink-0 items-center justify-center rounded-md"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ split */

function SplitEditor({ content, pool, onSave, pending, error, saved }: EditorProps) {
  const [band, setBand] = useState(str(content, "band", "canvas"));
  const [heading, setHeading] = useState(str(content, "heading"));
  const [body, setBody] = useState(str(content, "body"));
  const [bullets, setBullets] = useState<string[]>(
    Array.isArray(content.bullets) ? (content.bullets as string[]) : [],
  );
  const [image, setImage] = useState<string | null>(
    (content.image as { storage_path?: string } | null)?.storage_path ?? null,
  );
  const [imageSide, setImageSide] = useState(str(content, "imageSide", "left"));

  const alt = pool.find((p) => p.storage_path === image)?.alt ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          band,
          heading,
          body: body || null,
          bullets: bullets.filter((b) => b.trim()),
          image: image ? { storage_path: image, alt } : null,
          imageSide,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="split-heading">Heading</Label>
        <Input
          id="split-heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="h-10"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="split-body">Body copy</Label>
        <Textarea
          id="split-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />
        <p className="text-text-muted text-xs">
          Leave a blank line between paragraphs.
        </p>
      </div>

      <StringList
        label="Bullets (optional)"
        items={bullets}
        onChange={setBullets}
        placeholder="One short point"
      />

      <ImagePicker
        pool={pool}
        value={image}
        onChange={setImage}
        label="Photo (optional)"
        emptyLabel="No photo — the section runs full width as text."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <BandSelect id="split-band" value={band} onChange={setBand} />
        <div className="space-y-1">
          <Label htmlFor="split-side">Photo side (desktop)</Label>
          <select
            id="split-side"
            value={imageSide}
            onChange={(e) => setImageSide(e.target.value)}
            className="border-border h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ----------------------------------------------------------- feature band */

function FeatureBandEditor({ content, pool, onSave, pending, error, saved }: EditorProps) {
  const [heading, setHeading] = useState(str(content, "heading"));
  const [body, setBody] = useState(str(content, "body"));
  const [image, setImage] = useState<string | null>(
    (content.image as { storage_path?: string } | null)?.storage_path ?? null,
  );
  const [ctaLabel, setCtaLabel] = useState(str(content, "ctaLabel"));
  const [ctaHref, setCtaHref] = useState(str(content, "ctaHref"));

  const alt = pool.find((p) => p.storage_path === image)?.alt ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          heading,
          body: body || null,
          image: image ? { storage_path: image, alt } : null,
          ctaLabel: ctaLabel || null,
          ctaHref: ctaHref || null,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="fb-heading">Heading</Label>
        <Input
          id="fb-heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="h-10"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="fb-body">Body copy</Label>
        <Textarea id="fb-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      </div>

      <ImagePicker
        pool={pool}
        value={image}
        onChange={setImage}
        label="Background photo"
        hint="The photo sits behind a dark overlay, so pick one that reads well when dimmed."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fb-cta">Button label (optional)</Label>
          <Input
            id="fb-cta"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fb-href">Button link</Label>
          <Input
            id="fb-href"
            value={ctaHref}
            onChange={(e) => setCtaHref(e.target.value)}
            placeholder="#homes"
            className="h-10"
          />
          <p className="text-text-muted text-xs">
            The button only appears when both the label and the link are filled in.
          </p>
        </div>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------------ bento */

type Tile = {
  heading: string;
  body: string;
  image: string | null;
  wide: boolean;
  tone: "light" | "dark";
};

function readTiles(content: Record<string, unknown>): Tile[] {
  const raw = Array.isArray(content.tiles) ? content.tiles : [];
  return raw.map((t) => {
    const tile = t as Record<string, unknown>;
    return {
      heading: typeof tile.heading === "string" ? tile.heading : "",
      body: typeof tile.body === "string" ? tile.body : "",
      image:
        (tile.image as { storage_path?: string } | null)?.storage_path ?? null,
      wide: tile.wide === true,
      tone: tile.tone === "dark" ? "dark" : "light",
    };
  });
}

function BentoEditor({ content, pool, onSave, pending, error, saved }: EditorProps) {
  const [band, setBand] = useState(str(content, "band", "canvas"));
  const [heading, setHeading] = useState(str(content, "heading"));
  const [tiles, setTiles] = useState<Tile[]>(readTiles(content));

  function patch(i: number, next: Partial<Tile>) {
    setTiles((prev) => prev.map((t, j) => (j === i ? { ...t, ...next } : t)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          band,
          heading: heading || null,
          tiles: tiles.map((t) => ({
            heading: t.heading,
            body: t.body || null,
            image: t.image
              ? {
                  storage_path: t.image,
                  alt: pool.find((p) => p.storage_path === t.image)?.alt ?? null,
                }
              : null,
            wide: t.wide,
            tone: t.tone,
          })),
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="bento-heading">Section heading (optional)</Label>
        <Input
          id="bento-heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Tiles</p>
        <p className="text-text-muted text-xs">
          Up to six. Make the first one wide and dark so the grid has something
          to lead with — a grid of identical tiles reads as filler.
        </p>

        {tiles.map((tile, i) => (
          <div key={i} className="border-border space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-text-muted text-xs font-medium">Tile {i + 1}</p>
              <button
                type="button"
                onClick={() => setTiles((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Remove tile ${i + 1}`}
                className="text-danger hover:bg-danger/10 pressable flex size-8 items-center justify-center rounded-md"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>

            <Input
              value={tile.heading}
              onChange={(e) => patch(i, { heading: e.target.value })}
              placeholder="Tile heading"
              aria-label={`Tile ${i + 1} heading`}
              className="h-10"
              required
            />
            <Textarea
              value={tile.body}
              onChange={(e) => patch(i, { body: e.target.value })}
              placeholder="One or two lines (optional)"
              aria-label={`Tile ${i + 1} body`}
              rows={2}
            />

            <ImagePicker
              pool={pool}
              value={tile.image}
              onChange={(path) => patch(i, { image: path })}
              label="Tile photo (optional)"
              emptyLabel="No photo — the tile is text on a flat surface."
            />

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tile.wide}
                  onChange={(e) => patch(i, { wide: e.target.checked })}
                  className="size-4"
                />
                Double width
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tile.tone === "dark"}
                  onChange={(e) => patch(i, { tone: e.target.checked ? "dark" : "light" })}
                  className="size-4"
                />
                Dark tile
              </label>
            </div>
          </div>
        ))}

        {tiles.length < 6 ? (
          <button
            type="button"
            onClick={() =>
              setTiles((prev) => [
                ...prev,
                { heading: "", body: "", image: null, wide: false, tone: "light" },
              ])
            }
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add tile
          </button>
        ) : null}
      </div>

      <BandSelect id="bento-band" value={band} onChange={setBand} />
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* --------------------------------------------------------------- stat row */

type Stat = { figure: string; label: string; note: string };

function StatRowEditor({ content, onSave, pending, error, saved }: EditorProps) {
  const [band, setBand] = useState(str(content, "band", "sand"));
  const [heading, setHeading] = useState(str(content, "heading"));
  const [stats, setStats] = useState<Stat[]>(() => {
    const raw = Array.isArray(content.stats) ? content.stats : [];
    return raw.map((s) => {
      const stat = s as Record<string, unknown>;
      return {
        figure: typeof stat.figure === "string" ? stat.figure : "",
        label: typeof stat.label === "string" ? stat.label : "",
        note: typeof stat.note === "string" ? stat.note : "",
      };
    });
  });

  function patch(i: number, next: Partial<Stat>) {
    setStats((prev) => prev.map((s, j) => (j === i ? { ...s, ...next } : s)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          band,
          heading: heading || null,
          stats: stats.map((s) => ({
            figure: s.figure,
            label: s.label,
            note: s.note || null,
          })),
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="stat-heading">Section heading (optional)</Label>
        <Input
          id="stat-heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className="h-10"
        />
      </div>

      <p className="text-text-muted text-xs">
        Two to four figures. Only put a number here you could show a guest the
        evidence for — an invented figure is the fastest way to lose someone who
        is already suspicious.
      </p>

      <div className="space-y-3">
        {stats.map((stat, i) => (
          <div key={i} className="border-border grid gap-2 rounded-md border p-3 sm:grid-cols-[110px_1fr_auto]">
            <Input
              value={stat.figure}
              onChange={(e) => patch(i, { figure: e.target.value })}
              placeholder="1.4 km"
              aria-label={`Figure ${i + 1}`}
              className="h-10"
              required
            />
            <div className="space-y-2">
              <Input
                value={stat.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                placeholder="Label"
                aria-label={`Label ${i + 1}`}
                className="h-10"
                required
              />
              <Input
                value={stat.note}
                onChange={(e) => patch(i, { note: e.target.value })}
                placeholder="Small print (optional)"
                aria-label={`Note ${i + 1}`}
                className="h-10"
              />
            </div>
            <button
              type="button"
              onClick={() => setStats((prev) => prev.filter((_, j) => j !== i))}
              disabled={stats.length <= 2}
              aria-label={`Remove figure ${i + 1}`}
              className="text-danger hover:bg-danger/10 pressable flex size-10 items-center justify-center rounded-md disabled:opacity-30"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}

        {stats.length < 4 ? (
          <button
            type="button"
            onClick={() => setStats((prev) => [...prev, { figure: "", label: "", note: "" }])}
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add figure
          </button>
        ) : null}
      </div>

      <BandSelect id="stat-band" value={band} onChange={setBand} />
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

/* ------------------------------------------------------------------ quote */

function QuoteEditor({ content, onSave, pending, error, saved }: EditorProps) {
  const [band, setBand] = useState(str(content, "band", "sand"));
  const [quote, setQuote] = useState(str(content, "quote"));
  const [attribution, setAttribution] = useState(str(content, "attribution"));
  const [role, setRole] = useState(str(content, "role"));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          band,
          quote,
          attribution: attribution || null,
          role: role || null,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="q-quote">Quote</Label>
        <Textarea
          id="q-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={3}
          required
        />
        <p className="text-text-muted text-xs">
          Type it without quotation marks — they are added for you. Use a real
          guest&apos;s words, exactly as they wrote them.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="q-attr">Name (optional)</Label>
          <Input
            id="q-attr"
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-role">City or context (optional)</Label>
          <Input
            id="q-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Kolkata, stayed August 2026"
            className="h-10"
          />
        </div>
      </div>

      <BandSelect id="q-band" value={band} onChange={setBand} />
      <SaveBar pending={pending} saved={saved} error={error} />
    </form>
  );
}

export function LayoutEditor({ type, ...rest }: EditorProps & { type: LayoutType }) {
  switch (type) {
    case "split":
      return <SplitEditor {...rest} />;
    case "feature_band":
      return <FeatureBandEditor {...rest} />;
    case "bento":
      return <BentoEditor {...rest} />;
    case "stat_row":
      return <StatRowEditor {...rest} />;
    case "quote":
      return <QuoteEditor {...rest} />;
  }
}
