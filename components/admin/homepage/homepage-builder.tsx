"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { ImagePicker, type ImageChoice } from "@/components/admin/homepage/image-picker";
import { LayoutEditor } from "@/components/admin/homepage/layout-editors";
import {
  addCustomSection,
  deleteCustomSection,
  moveSection,
  updateBuiltinOverrides,
  updateCustomSection,
  updateSectionVisibility,
} from "@/app/admin/(dashboard)/homepage/actions";
import {
  BUILTIN_SECTIONS,
  LAYOUTS,
  LAYOUT_TYPES,
  isLayoutType,
  type LayoutType,
} from "@/lib/homepage-blocks";
import type { HomepageSection } from "@/lib/types/database";

function overridesOf(section: HomepageSection): Record<string, string> {
  const raw = section.content;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
}

/**
 * The editor for a code-defined section: reorder, hide, and override any of the
 * strings and images the registry declares editable.
 *
 * Every field is optional and empty means "use the default", which is why the
 * inputs are placeholder-driven rather than pre-filled with the default text.
 * Pre-filling would turn every default into an override the moment the owner
 * hit save, and the defaults are the copy that was actually written for this
 * audience — they should survive until someone deliberately replaces them.
 */
function BuiltinEditor({
  section,
  pool,
}: {
  section: HomepageSection;
  pool: ImageChoice[];
}) {
  const spec = BUILTIN_SECTIONS[section.key];
  const save = useSaveAction(updateBuiltinOverrides);
  const current = overridesOf(section);
  const [images, setImages] = useState<Record<string, string | null>>(() => {
    const out: Record<string, string | null> = {};
    for (const f of spec?.fields ?? []) {
      if (f.kind === "image") out[f.key] = current[f.key] ?? null;
    }
    return out;
  });

  if (!spec) return null;
  if (!spec.fields.length) {
    return (
      <p className="text-text-muted text-sm">
        This section has no editable text — it is built from your listings and
        settings. Hide it if you don&apos;t want it on the page.
      </p>
    );
  }

  const textFields = spec.fields.filter((f) => f.kind !== "image");
  const imageFields = spec.fields.filter((f) => f.kind === "image");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // The pickers live outside the form's own inputs, so their values are
        // merged in here rather than round-tripped through hidden fields.
        for (const [key, value] of Object.entries(images)) {
          formData.set(key, value ?? "");
        }
        save.run(section.key, formData);
      }}
      className="space-y-4"
    >
      {textFields.map((field) => {
        const id = `${section.key}-${field.key}`;
        const placeholder = spec.defaults[field.key] || "Built from your listings";
        return (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={id}>{field.label}</Label>
            {field.kind === "textarea" ? (
              <Textarea
                id={id}
                name={field.key}
                defaultValue={current[field.key] ?? ""}
                placeholder={placeholder}
                rows={3}
              />
            ) : (
              <Input
                id={id}
                name={field.key}
                defaultValue={current[field.key] ?? ""}
                placeholder={placeholder}
                className="h-10"
              />
            )}
            {field.hint ? (
              <p className="text-text-muted text-xs">{field.hint}</p>
            ) : null}
          </div>
        );
      })}

      {imageFields.length ? (
        <div className="border-border space-y-4 border-t pt-4">
          {imageFields.map((field) => (
            <ImagePicker
              key={field.key}
              pool={pool}
              value={images[field.key] ?? null}
              onChange={(path) =>
                setImages((prev) => ({ ...prev, [field.key]: path }))
              }
              label={field.label}
              hint={field.hint}
              emptyLabel="Using the photo set in the site's image config."
            />
          ))}
        </div>
      ) : null}

      <p className="text-text-muted text-xs">
        Leave a field empty to keep the wording the site ships with — shown in
        grey above.
      </p>

      <SaveBar pending={save.pending} saved={save.saved} error={save.error} />
    </form>
  );
}

function CustomEditor({
  section,
  pool,
}: {
  section: HomepageSection;
  pool: ImageChoice[];
}) {
  const save = useSaveAction(updateCustomSection);
  const [title, setTitle] = useState(section.title ?? "");

  if (!isLayoutType(section.type)) {
    return (
      <p className="text-danger text-sm">
        This section uses a layout this version of the site doesn&apos;t know
        about. Delete it, or restore the code that rendered it.
      </p>
    );
  }

  const content =
    section.content && typeof section.content === "object"
      ? (section.content as Record<string, unknown>)
      : {};

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={`title-${section.id}`}>
          Name for your reference (not shown on the page)
        </Label>
        <Input
          id={`title-${section.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={LAYOUTS[section.type].label}
          className="h-10"
        />
      </div>

      <LayoutEditor
        type={section.type}
        content={content}
        pool={pool}
        onSave={(next) => save.run(section.id, section.type, title, next)}
        pending={save.pending}
        error={save.error}
        saved={save.saved}
      />
    </div>
  );
}

function SectionRow({
  section,
  canMoveUp,
  canMoveDown,
  pool,
  defaultExpanded,
}: {
  section: HomepageSection;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pool: ImageChoice[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const vis = useSaveAction(updateSectionVisibility);
  const move = useSaveAction(moveSection);
  const del = useSaveAction(deleteCustomSection);
  const [confirming, setConfirming] = useState(false);

  const isCustom = section.kind === "custom";
  const layout = isCustom && isLayoutType(section.type) ? LAYOUTS[section.type] : null;
  const Icon = layout?.icon;
  const spec = BUILTIN_SECTIONS[section.key];

  const label = section.title || spec?.label || layout?.label || section.key;
  const note = isCustom ? (layout?.note ?? section.type) : (spec?.note ?? "");

  return (
    <div className="border-border border-b last:border-b-0">
      <div className="flex items-start gap-3 p-4">
        {Icon ? (
          <Icon className="text-text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{label}</span>
            {section.locked ? (
              <Lock className="text-text-muted size-3.5 shrink-0" aria-label="Fixed position" />
            ) : null}
            {!section.visible ? (
              <span className="bg-surface-subtle text-text-muted shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                Hidden
              </span>
            ) : null}
          </p>
          {note ? <p className="text-text-muted mt-0.5 text-xs">{note}</p> : null}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move.run(section.id, "up")}
            disabled={!canMoveUp || move.pending}
            aria-label={`Move ${label} up`}
            className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move.run(section.id, "down")}
            disabled={!canMoveDown || move.pending}
            aria-label={`Move ${label} down`}
            className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => vis.run(section.id, !section.visible)}
            disabled={section.locked || vis.pending}
            aria-label={
              section.locked
                ? `${label} is always shown`
                : section.visible
                  ? `Hide ${label}`
                  : `Show ${label}`
            }
            className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
          >
            {section.visible ? (
              <Eye className="size-4" aria-hidden="true" />
            ) : (
              <EyeOff className="size-4" aria-hidden="true" />
            )}
          </button>
          {isCustom ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={del.pending}
              aria-label={`Delete ${label}`}
              className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-full"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {move.error || vis.error || del.error ? (
        <p role="alert" className="text-danger px-4 pb-3 text-sm">
          {move.error ?? vis.error ?? del.error}
        </p>
      ) : null}

      {confirming ? (
        <div className="border-danger/30 bg-danger/5 mx-4 mb-4 rounded-md border p-3">
          <p className="text-sm font-medium">Delete “{label}”?</p>
          <p className="text-text-muted mt-1 text-sm">
            Its wording and photo choices go with it. This can&apos;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => del.run(section.id)}
              disabled={del.pending}
              className="bg-danger pressable flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white"
            >
              {del.pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Delete section
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="border-border hover:bg-surface pressable flex h-9 items-center rounded-md border px-3 text-sm font-medium"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="bg-surface-subtle border-border border-t p-4">
          {isCustom ? (
            <CustomEditor section={section} pool={pool} />
          ) : (
            <BuiltinEditor section={section} pool={pool} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function LayoutPicker({
  onPick,
  onCancel,
  pending,
}: {
  onPick: (type: LayoutType) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="border-border rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-medium">Pick a layout</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {LAYOUT_TYPES.map((type) => {
          const { label, note, icon: Icon } = LAYOUTS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              disabled={pending}
              className="border-border hover:border-primary hover:bg-surface-subtle pressable flex gap-3 rounded-md border p-3 text-left disabled:opacity-60"
            >
              <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                <span className="text-text-muted block text-xs">{note}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HomepageBuilder({
  sections,
  pool,
}: {
  sections: HomepageSection[];
  pool: ImageChoice[];
}) {
  const [picking, setPicking] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handlePick(type: LayoutType) {
    setAddPending(true);
    setAddError(null);
    const result = await addCustomSection(type);
    setAddPending(false);

    if (result.error) {
      setAddError(result.error);
      return;
    }
    if (result.id) setJustAdded(result.id);
    setPicking(false);
  }

  // A section can only move into a slot that isn't locked, which is what keeps
  // the hero at the top and the closing CTA at the bottom.
  const movable = sections.map((s, i) => ({
    up: !s.locked && i > 0 && !sections[i - 1].locked,
    down: !s.locked && i < sections.length - 1 && !sections[i + 1].locked,
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <div className="border-border rounded-md border">
        {sections.map((section, i) => (
          <SectionRow
            key={section.id}
            section={section}
            canMoveUp={movable[i].up}
            canMoveDown={movable[i].down}
            pool={pool}
            defaultExpanded={section.id === justAdded}
          />
        ))}
      </div>

      {picking ? (
        <LayoutPicker
          onPick={handlePick}
          onCancel={() => setPicking(false)}
          pending={addPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={addPending}
          className="hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed font-medium"
        >
          {addPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add a section
        </button>
      )}

      {addError ? (
        <p role="alert" className="text-danger text-sm">
          {addError}
        </p>
      ) : null}

      <p className="text-text-muted text-sm">
        New sections start hidden. Fill one in, save it, then use the eye icon to
        put it on the page.
      </p>
    </div>
  );
}
