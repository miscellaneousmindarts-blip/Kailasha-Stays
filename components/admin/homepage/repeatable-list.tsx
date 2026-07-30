"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

/**
 * Add / remove / reorder primitive for repeatable content — FAQ items,
 * review cards, trust-ribbon entries, comparison-table rows, photo grids,
 * hero chips. One component instead of six near-duplicate implementations:
 * every list on the homepage builder is "an array of small objects with a
 * delete and an up/down", and the differences are entirely in how one item
 * renders, which is what `renderItem` is for.
 *
 * Reorder is up/down buttons, not drag — these lists are typically short
 * (a handful of FAQ items, three or four trust-ribbon entries), and buttons
 * need no pointer/keyboard sensor setup to be fully accessible. Section
 * ORDER on the page itself is the one place a full drag-and-drop outline is
 * worth the complexity — see homepage-shell.tsx.
 */
export function RepeatableList<T>({
  items,
  onChange,
  newItem,
  renderItem,
  addLabel,
  minItems = 0,
  maxItems,
  itemLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
  renderItem: (item: T, index: number, patch: (partial: Partial<T>) => void) => React.ReactNode;
  addLabel: string;
  /** Below this count, remove is disabled rather than letting the list go empty. */
  minItems?: number;
  maxItems?: number;
  /** Used in aria-labels: "Remove review 2", "Move FAQ item 2 up". */
  itemLabel?: string;
}) {
  const label = itemLabel ?? "item";

  function patchAt(i: number, partial: Partial<T>) {
    onChange(items.map((it, j) => (j === i ? { ...it, ...partial } : it)));
  }
  function removeAt(i: number) {
    onChange(items.filter((_, j) => j !== i));
  }
  function moveAt(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border-border rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-text-muted text-xs font-medium">
              {label} {i + 1}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveAt(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${label} ${i + 1} up`}
                className="hover:bg-surface-subtle pressable flex size-7 items-center justify-center rounded-md disabled:opacity-30"
              >
                <ChevronUp className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveAt(i, 1)}
                disabled={i === items.length - 1}
                aria-label={`Move ${label} ${i + 1} down`}
                className="hover:bg-surface-subtle pressable flex size-7 items-center justify-center rounded-md disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={items.length <= minItems}
                aria-label={`Remove ${label} ${i + 1}`}
                className="text-danger hover:bg-danger/10 pressable flex size-7 items-center justify-center rounded-md disabled:opacity-30"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
          {renderItem(item, i, (partial) => patchAt(i, partial))}
        </div>
      ))}

      {maxItems === undefined || items.length < maxItems ? (
        <button
          type="button"
          onClick={() => onChange([...items, newItem()])}
          className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
