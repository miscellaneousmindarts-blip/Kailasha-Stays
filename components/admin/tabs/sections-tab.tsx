"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlockPicker } from "@/components/admin/block-picker";
import { BlockEditorSwitch } from "@/components/admin/block-editors/block-editor-switch";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addSection,
  deleteSection,
  moveSection,
  updateSectionContent,
  updateSectionMeta,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import { BLOCK_TYPES, isKnownBlockType, type BlockType } from "@/lib/blocks";
import type {
  PropertyImage,
  PropertySection,
  SectionAudience,
} from "@/lib/types/database";

const AUDIENCE_LABEL: Record<SectionAudience, string> = {
  public: "Public",
  guest: "Guest portal only",
  both: "Public + guest portal",
};

function SectionRow({
  propertyId,
  section,
  isFirst,
  isLast,
  propertyImages,
  defaultExpanded,
}: {
  propertyId: string;
  section: PropertySection;
  isFirst: boolean;
  isLast: boolean;
  propertyImages: PropertyImage[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const meta = useSaveAction(updateSectionMeta);
  const content = useSaveAction(updateSectionContent);
  const del = useSaveAction(deleteSection);
  const move = useSaveAction(moveSection);

  const known = isKnownBlockType(section.type);
  const blockMeta = known ? BLOCK_TYPES[section.type as BlockType] : null;
  const Icon = blockMeta?.icon;

  return (
    <div className="border-border border-b last:border-b-0">
      <div className="flex items-center gap-3 p-4">
        {Icon ? <Icon className="text-text-muted size-5 shrink-0" aria-hidden="true" /> : null}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-medium">
            {section.title || blockMeta?.label || section.type}
          </p>
          <p className="text-text-muted truncate text-xs">
            {AUDIENCE_LABEL[section.audience]}
            {!section.visible ? " · Hidden" : ""}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => move.run(propertyId, section.id, "up")}
            disabled={isFirst || move.pending}
            aria-label="Move up"
            className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move.run(propertyId, section.id, "down")}
            disabled={isLast || move.pending}
            aria-label="Move down"
            className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => meta.run(propertyId, section.id, { visible: !section.visible })}
            disabled={meta.pending}
            aria-label={section.visible ? "Hide section" : "Show section"}
            className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
          >
            {section.visible ? (
              <Eye className="size-4" aria-hidden="true" />
            ) : (
              <EyeOff className="size-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => del.run(propertyId, section.id)}
            disabled={del.pending}
            aria-label="Delete section"
            className="text-danger hover:bg-danger/10 pressable flex size-9 items-center justify-center rounded-full"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {expanded && known ? (
        <div className="bg-surface-subtle border-border space-y-6 border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              meta.run(propertyId, section.id, {
                title: (formData.get("title") as string) || null,
                audience: formData.get("audience") as SectionAudience,
              });
            }}
            className="grid gap-3 sm:grid-cols-[1fr_220px]"
          >
            <div className="space-y-1">
              <Label htmlFor={`title-${section.id}`}>Section title (optional)</Label>
              <Input
                id={`title-${section.id}`}
                name="title"
                defaultValue={section.title ?? ""}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`audience-${section.id}`}>Show to</Label>
              <select
                id={`audience-${section.id}`}
                name="audience"
                defaultValue={section.audience}
                className="border-border h-10 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="public">Public property page</option>
                <option value="guest">Guest portal only</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={meta.pending}
                className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium"
              >
                {meta.pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                Save title & audience
              </button>
              {meta.error ? <p role="alert" className="text-danger mt-1 text-sm">{meta.error}</p> : null}
            </div>
          </form>

          <div className="border-border border-t pt-4">
            <BlockEditorSwitch
              type={section.type}
              content={section.content}
              onSave={(next) => content.run(propertyId, section.id, section.type, next)}
              pending={content.pending}
              error={content.error}
              saved={content.saved}
              propertyImages={propertyImages}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SectionsTab({
  propertyId,
  sections,
  propertyImages,
}: {
  propertyId: string;
  sections: PropertySection[];
  propertyImages: PropertyImage[];
}) {
  const [picking, setPicking] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handlePick(type: BlockType) {
    setAddPending(true);
    setAddError(null);
    const result = await addSection(propertyId, type, "public");
    setAddPending(false);

    if (result.error) {
      setAddError(result.error);
      return;
    }
    if (result.id) setJustAddedId(result.id);
    setPicking(false);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-text-muted text-sm">
        Anything beyond the fixed fields — nearby distances, FAQs, extra
        photos — lives here. New block types can be added later without
        touching existing sections.
      </p>

      {sections.length ? (
        <div className="border-border rounded-md border">
          {sections.map((s, i) => (
            <SectionRow
              key={s.id}
              propertyId={propertyId}
              section={s}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              propertyImages={propertyImages}
              defaultExpanded={s.id === justAddedId}
            />
          ))}
        </div>
      ) : null}

      {picking ? (
        <BlockPicker onPick={handlePick} onCancel={() => setPicking(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={addPending}
          className="hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add section
        </button>
      )}
      {addError ? <p role="alert" className="text-danger text-sm">{addError}</p> : null}
    </div>
  );
}
