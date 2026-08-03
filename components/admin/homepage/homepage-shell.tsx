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
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Lock,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

import { useSaveAction } from "@/components/admin/use-save-action";
import { MediaLibraryProvider } from "@/components/admin/homepage/media-library-context";
import { MediaLibraryPanel } from "@/components/admin/homepage/media-library-panel";
import { LayoutEditor } from "@/components/admin/homepage/layout-editors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HeroEditor,
  TrustRibbonEditor,
  MapEditor,
  HomesEditor,
  WhyApartmentEditor,
  MeetHostEditor,
  NothingHiddenEditor,
  ProofEditor,
  ServicesEditor,
  ShravanEditor,
  FaqEditor,
  CloseEditor,
} from "@/components/admin/homepage/builtin-editors";
import {
  addCustomSection,
  deleteCustomSection,
  reorderSections,
  updateBuiltinSection,
  updateCustomSection,
  updateSectionVisibility,
} from "@/app/admin/(dashboard)/homepage/actions";
import {
  BUILTIN_META,
  LAYOUTS,
  LAYOUT_TYPES,
  isBuiltinKey,
  isLayoutType,
  type BuiltinKey,
  type LayoutType,
} from "@/lib/homepage-blocks";
import type { HomepageImage, HomepageSection, SiteSettings } from "@/lib/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BUILTIN_EDITORS: Record<BuiltinKey, React.ComponentType<any>> = {
  hero: HeroEditor,
  trust_ribbon: TrustRibbonEditor,
  map: MapEditor,
  homes: HomesEditor,
  why_apartment: WhyApartmentEditor,
  meet_host: MeetHostEditor,
  nothing_hidden: NothingHiddenEditor,
  proof: ProofEditor,
  services: ServicesEditor,
  shravan: ShravanEditor,
  faq: FaqEditor,
  close: CloseEditor,
};

function labelFor(section: HomepageSection): string {
  if (section.title) return section.title;
  if (section.kind === "builtin" && isBuiltinKey(section.key)) return BUILTIN_META[section.key].label;
  if (section.kind === "custom" && isLayoutType(section.type)) return LAYOUTS[section.type].label;
  return section.key;
}

function noteFor(section: HomepageSection): string {
  if (section.kind === "builtin" && isBuiltinKey(section.key)) return BUILTIN_META[section.key].note;
  if (section.kind === "custom" && isLayoutType(section.type)) return LAYOUTS[section.type].note;
  return "";
}

function OutlineRow({
  section,
  selected,
  onSelect,
}: {
  section: HomepageSection;
  selected: boolean;
  onSelect: () => void;
}) {
  const pinned = section.pin !== null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: pinned,
  });
  const vis = useSaveAction(updateSectionVisibility);

  const label = labelFor(section);
  const Icon =
    section.kind === "builtin" && isBuiltinKey(section.key)
      ? BUILTIN_META[section.key].icon
      : section.kind === "custom" && isLayoutType(section.type)
        ? LAYOUTS[section.type].icon
        : null;

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
        onClick={() => vis.run(section.id, !section.visible)}
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

function BuiltinEditorPanel({
  section,
  settings,
  onSaved,
}: {
  section: HomepageSection;
  settings: SiteSettings;
  onSaved: () => void;
}) {
  const save = useSaveAction(updateBuiltinSection);
  if (!isBuiltinKey(section.key)) return null;
  const Editor = BUILTIN_EDITORS[section.key];

  return (
    <Editor
      content={section.content}
      settings={settings}
      pending={save.pending}
      error={save.error}
      saved={save.saved}
      // `settingsPatch` is undefined for the sections that don't own any
      // site_settings values; the action ignores it in that case.
      onSave={async (content: unknown, settingsPatch?: Record<string, string | number | null>) => {
        const ok = await save.runAndWait(section.id, section.key, content, settingsPatch);
        if (ok) onSaved();
      }}
    />
  );
}

function CustomEditorPanel({
  section,
  onSaved,
  onDeleted,
}: {
  section: HomepageSection;
  onSaved: (title: string) => void;
  onDeleted: () => void;
}) {
  const save = useSaveAction(updateCustomSection);
  const del = useSaveAction(deleteCustomSection);
  const [title, setTitle] = useState(section.title ?? "");
  const [confirming, setConfirming] = useState(false);

  if (!isLayoutType(section.type)) {
    return (
      <p className="text-danger text-sm">
        This section uses a layout this version of the site doesn&apos;t know about. Delete it below.
      </p>
    );
  }

  const content = section.content && typeof section.content === "object" ? (section.content as Record<string, unknown>) : {};

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={`title-${section.id}`}>Name for your reference (not shown on the page)</Label>
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
        onSave={async (next) => {
          const ok = await save.runAndWait(section.id, section.type, title, next);
          if (ok) onSaved(title);
        }}
        pending={save.pending}
        error={save.error}
        saved={save.saved}
      />

      <div className="border-border border-t pt-4">
        {confirming ? (
          <div className="border-danger/30 bg-danger/5 space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Delete this section?</p>
            <p className="text-text-muted text-sm">This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await del.runAndWait(section.id);
                  if (ok) onDeleted();
                }}
                disabled={del.pending}
                className="bg-danger pressable flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white"
              >
                {del.pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
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
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-danger hover:bg-danger/10 pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete this section
          </button>
        )}
      </div>
      {del.error ? (
        <p role="alert" className="text-danger text-sm">
          {del.error}
        </p>
      ) : null}
    </div>
  );
}

function LayoutPicker({ onPick, onCancel, pending }: { onPick: (type: LayoutType) => void; onCancel: () => void; pending: boolean }) {
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

type Tab = "sections" | "media";

function ShellInner({
  initialSections,
  settings,
}: {
  initialSections: HomepageSection[];
  settings: SiteSettings;
}) {
  const [sections, setSections] = useState(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sections");
  const [picking, setPicking] = useState(false);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewWidth, setPreviewWidth] = useState<"phone" | "desktop">("phone");
  const [previewKey, setPreviewKey] = useState(0);

  const reorder = useSaveAction(reorderSections);
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

  function refreshPreview() {
    setPreviewKey((k) => k + 1);
  }

  function patchSection(id: string, patch: Partial<HomepageSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handlePick(type: LayoutType) {
    setAddPending(true);
    setAddError(null);
    const result = await addCustomSection(type);
    setAddPending(false);
    if (result.error) {
      setAddError(result.error);
      return;
    }
    if (result.id) {
      // Land it just above the pinned closing section, matching the server's placement.
      const closeIndex = sections.findIndex((s) => s.pin === "last");
      const insertAt = closeIndex === -1 ? sections.length : closeIndex;
      const newRow: HomepageSection = {
        id: result.id,
        key: `${type}_new`,
        kind: "custom",
        type,
        title: null,
        content: {},
        visible: false,
        locked: false,
        can_hide: true,
        pin: null,
        sort_order: 0,
        updated_at: new Date().toISOString(),
      };
      setSections((prev) => [...prev.slice(0, insertAt), newRow, ...prev.slice(insertAt)]);
      setSelectedId(result.id);
    }
    setPicking(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[600px] gap-4 lg:h-[calc(100vh-6rem)]">
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
            {/* Explicit id: dnd-kit otherwise derives the id backing its
                aria-describedby announcements from an incrementing counter,
                which React 18 Strict Mode's double-render-in-dev can bump
                differently on the server than the client and trip a
                hydration mismatch. A stable id sidesteps that outright. */}
            <DndContext id="homepage-sections" sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <OutlineRow
                    key={section.id}
                    section={section}
                    selected={section.id === selectedId}
                    onSelect={() => setSelectedId(section.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {reorder.error ? (
              <p role="alert" className="text-danger p-2.5 text-sm">
                {reorder.error}
              </p>
            ) : null}

            <div className="p-2.5">
              {picking ? (
                <LayoutPicker onPick={handlePick} onCancel={() => setPicking(false)} pending={addPending} />
              ) : (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="hover:bg-surface-subtle pressable flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm font-medium"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add a section
                </button>
              )}
              {addError ? (
                <p role="alert" className="text-danger mt-2 text-sm">
                  {addError}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <MediaLibraryPanel />
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
              <p className="truncate font-medium">{labelFor(selected)}</p>
              {noteFor(selected) ? <p className="text-text-muted truncate text-xs">{noteFor(selected)}</p> : null}
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
            {selected.kind === "builtin" ? (
              <BuiltinEditorPanel
                key={selected.id}
                section={selected}
                settings={settings}
                onSaved={refreshPreview}
              />
            ) : (
              <CustomEditorPanel
                key={selected.id}
                section={selected}
                onSaved={(title) => {
                  patchSection(selected.id, { title });
                  refreshPreview();
                }}
                onDeleted={() => {
                  setSections((prev) => prev.filter((s) => s.id !== selected.id));
                  setSelectedId(null);
                  refreshPreview();
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="text-text-muted hidden flex-1 items-center justify-center rounded-lg border border-dashed lg:flex">
          <p className="text-sm">Pick a section on the left to edit it.</p>
        </div>
      )}

      {/* Preview */}
      <div className={`shrink-0 flex-col lg:flex ${showPreview ? "hidden w-[420px] lg:flex" : "hidden"}`}>
        <div className="border-border bg-surface-subtle flex shrink-0 items-center gap-1 rounded-t-lg border border-b-0 p-2">
          <button
            type="button"
            onClick={() => setPreviewWidth("phone")}
            aria-label="Phone width"
            aria-pressed={previewWidth === "phone"}
            className={`pressable flex size-8 items-center justify-center rounded-md ${previewWidth === "phone" ? "bg-surface shadow-card" : "hover:bg-surface/60"}`}
          >
            <Smartphone className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewWidth("desktop")}
            aria-label="Desktop width"
            aria-pressed={previewWidth === "desktop"}
            className={`pressable flex size-8 items-center justify-center rounded-md ${previewWidth === "desktop" ? "bg-surface shadow-card" : "hover:bg-surface/60"}`}
          >
            <Monitor className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={refreshPreview}
            className="text-text-muted hover:text-foreground pressable ml-auto text-xs font-medium"
          >
            Refresh
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-surface pressable flex size-8 items-center justify-center rounded-md"
            aria-label="Open homepage in a new tab"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            aria-label="Hide preview"
            className="hover:bg-surface pressable flex size-8 items-center justify-center rounded-md"
          >
            <PanelRightClose className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="border-border bg-surface-subtle flex-1 overflow-auto rounded-b-lg border p-3">
          <iframe
            key={previewKey}
            src="/"
            title="Homepage preview"
            className={`bg-background mx-auto h-full rounded-md border-0 shadow-sm transition-[width] ${
              previewWidth === "phone" ? "w-[390px]" : "w-full"
            }`}
          />
        </div>
      </div>

      {!showPreview ? (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          aria-label="Show preview"
          className="border-border hover:bg-surface-subtle pressable hidden h-9 shrink-0 items-center gap-1.5 self-start rounded-md border px-2 lg:flex"
        >
          <PanelRightOpen className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function HomepageShell({
  sections,
  images,
  settings,
}: {
  sections: HomepageSection[];
  images: HomepageImage[];
  settings: SiteSettings;
}) {
  return (
    <MediaLibraryProvider initialPool={images}>
      <ShellInner initialSections={sections} settings={settings} />
    </MediaLibraryProvider>
  );
}
