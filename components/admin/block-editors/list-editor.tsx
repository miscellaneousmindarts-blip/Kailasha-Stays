"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/admin/save-bar";
import type { BlockContent } from "@/lib/blocks";

export function ListEditor({
  content,
  onSave,
  pending,
  error,
  saved,
}: {
  content: BlockContent<"list">;
  onSave: (content: BlockContent<"list">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  const [style, setStyle] = useState(content.style);
  const [items, setItems] = useState(content.items.length ? content.items : [""]);

  function updateItem(i: number, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? value : it)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ style, items: items.filter((i) => i.trim() !== "") });
      }}
      className="space-y-3"
    >
      <select
        value={style}
        onChange={(e) => setStyle(e.target.value as typeof style)}
        className="border-border h-10 rounded-md border bg-transparent px-3 text-sm"
      >
        <option value="bullet">Bullets</option>
        <option value="check">Checkmarks</option>
        <option value="number">Numbered</option>
      </select>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              className="h-10"
            />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove item"
              className="text-danger hover:bg-danger/10 pressable flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, ""])}
          className="hover:bg-surface-subtle pressable flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add item
        </button>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
