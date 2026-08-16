"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Eye, EyeOff, ExternalLink, GripVertical, Lock, X } from "lucide-react";

import { useSaveAction } from "@/components/admin/use-save-action";
import { PlatformMediaLibraryProvider } from "@/components/superadmin/homepage/platform-media-library-context";
import { PlatformMediaLibraryPanel } from "@/components/superadmin/homepage/platform-media-library-panel";
import {
  reorderPlatformSections,
  updatePlatformSection,
  updatePlatformSectionVisibility,
} from "@/app/superadmin/homepage/actions";
import {
  PLATFORM_SECTION_META,
  isPlatformSectionKey,
  type PlatformSectionKey,
} from "@/lib/platform-sections-schema";
import type { PlatformImage, PlatformSection } from "@/lib/types/database";
import { PLATFORM_SITE_URL } from "@/lib/platform-content";

/**
 * Same overall structure as components/admin/homepage/homepage-shell.tsx
 * (outline list with drag-reorder, an editor panel, a live preview iframe),
 * but not a generalisation of it — see docs/apex-homepage-editor-plan.md §5
 * for why: no custom sections, no site_settings coupling, and a separate
 * media library. `editors` is passed in rather than imported directly so
 * this file can be finished and typechecked before every individual editor
 * exists (Task #14 fills the registry in).
 */
export type PlatformEditorProps = {
  content: unknown;
  pending: boolean;
  error: string | null;
  saved: boolean;
  onSave: (content: unknown) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlatformEditorRegistry = Record<PlatformSectionKey, React.ComponentType<any>>;

function OutlineRow({
  section,
  selected,
  onSelect,
  onToggled,
}: {
  section: PlatformSection;
  selected: boolean;
  onSelect: () => void;
  onToggled: (visible: boolean) => void;
}) {
  const pinned = section.pin !== null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: pinned,
  });
  const vis = useSaveAction(updatePlatformSectionVisibility);

  const meta = isPlatformSectionKey(section.key) ? PLATFORM_SECTION_META[section.key] : null;
  const label = meta?.label ?? section.key;
  const Icon = meta?.icon ?? null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-border flex items-center gap-1.5 border-b p-2.5 last:border-b-0 ${
        selected ? "bg-primary-tint" : "hover:bg-surface-subtle"
      } ${isDragging ? "shadow-overlay z-10 opacity-90" : ""}`}
    >
      {pinned ? (
        <Lock className="text-text-muted size-4 shrink-0" aria-label="Fixed position" />
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${label}`}
          className="hover:bg-surface text-text-muted flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      )}

      {Icon ? <Icon className="text-text-muted size-4 shrink-0" aria-hidden="true" /> : null}

      <button type="button" onClick={onSelect} className="min-w-0 flex-1 py-0.5 text-left">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{label}</span>
          {!section.visible ? (
            <span className="bg-surface-subtle text-text-muted shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
              Hidden
            </span>
          ) : null}
        </p>
      </button>

      <button
        type="button"
        onClick={async () => {
          const next = !section.visible;
          const ok = await vis.runAndWait(section.id, next);
          if (ok) onToggled(next);
        }}
        disabled={!section.can_hide || vis.pending}
        aria-label={
          !section.can_hide ? `${label} is always shown` : section.visible ? `Hide ${label}` : `Show ${label}`
        }
        className="hover:bg-surface pressable flex size-8 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
      >
        {section.visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

function EditorPanel({ section, editors }: { section: PlatformSection; editors: PlatformEditorRegistry }) {
  const save = useSaveAction(updatePlatformSection);
  if (!isPlatformSectionKey(section.key)) return null;
  const Editor = editors[section.key];

  return (
    <Editor
      content={section.content}
      pending={save.pending}
      error={save.error}
      saved={save.saved}
      onSave={(content: unknown) => save.runAndWait(section.id, section.key, content)}
    />
  );
}

type Tab = "sections" | "media";

function ShellInner({
  initialSections,
  editors,
}: {
  initialSections: PlatformSection[];
  editors: PlatformEditorRegistry;
}) {
  const [sections, setSections] = useState(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sections");

  const reorder = useSaveAction(reorderPlatformSections);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selected = useMemo(() => sections.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(sections, oldIndex, newIndex);
    setSections(next);
    const ok = await reorder.runAndWait(next.map((s) => s.id));
    if (!ok) setSections(sections); // roll back
  }

  function patchSection(id: string, patch: Partial<PlatformSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[600px] flex-col gap-3 lg:h-[calc(100vh-6rem)]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="text-text-muted text-sm">Editing the apex homepage.</p>
        {/* No embedded preview: /superadmin and the apex are different hosts
            (proxy.ts's routing model), so an iframe here would be
            cross-origin. Opening the real page is the honest alternative. */}
        <a
          href={PLATFORM_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
        >
          View live site
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
      {/* Outline */}
      <div
        className={`border-border w-full shrink-0 flex-col rounded-lg border lg:flex lg:w-[300px] ${
          selected ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="border-border flex shrink-0 border-b">
          <button
            type="button"
            onClick={() => setTab("sections")}
            className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-medium ${
              tab === "sections" ? "border-primary text-primary" : "text-text-muted border-transparent"
            }`}
          >
            Sections
          </button>
          <button
            type="button"
            onClick={() => setTab("media")}
            className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-medium ${
              tab === "media" ? "border-primary text-primary" : "text-text-muted border-transparent"
            }`}
          >
            Photos
          </button>
        </div>

        {tab === "sections" ? (
          <div className="flex-1 overflow-y-auto">
            <DndContext id="platform-sections" sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <OutlineRow
                    key={section.id}
                    section={section}
                    selected={section.id === selectedId}
                    onSelect={() => setSelectedId(section.id)}
                    onToggled={(visible) => patchSection(section.id, { visible })}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {reorder.error ? (
              <p role="alert" className="text-danger p-2.5 text-sm">
                {reorder.error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <PlatformMediaLibraryPanel />
          </div>
        )}
      </div>

      {/* Editor */}
      {selected ? (
        <div className="border-border flex w-full min-w-0 flex-1 flex-col rounded-lg border lg:flex">
          <div className="border-border flex shrink-0 items-center gap-2 border-b p-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Back to sections"
              className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full lg:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {isPlatformSectionKey(selected.key) ? PLATFORM_SECTION_META[selected.key].label : selected.key}
              </p>
              {isPlatformSectionKey(selected.key) ? (
                <p className="text-text-muted truncate text-xs">{PLATFORM_SECTION_META[selected.key].note}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close editor"
              className="hover:bg-surface-subtle pressable hidden size-9 items-center justify-center rounded-full lg:flex"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <EditorPanel key={selected.id} section={selected} editors={editors} />
          </div>
        </div>
      ) : (
        <div className="text-text-muted hidden flex-1 items-center justify-center rounded-lg border border-dashed lg:flex">
          <p className="text-sm">Pick a section on the left to edit it.</p>
        </div>
      )}

      </div>
    </div>
  );
}

export function PlatformHomepageShell({
  sections,
  images,
  editors,
}: {
  sections: PlatformSection[];
  images: PlatformImage[];
  editors: PlatformEditorRegistry;
}) {
  return (
    <PlatformMediaLibraryProvider initialPool={images}>
      <ShellInner initialSections={sections} editors={editors} />
    </PlatformMediaLibraryProvider>
  );
}
