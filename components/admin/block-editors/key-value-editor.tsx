"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/admin/save-bar";
import type { BlockContent } from "@/lib/blocks";

export function KeyValueEditor({
  content,
  onSave,
  pending,
  error,
  saved,
}: {
  content: BlockContent<"key_value">;
  onSave: (content: BlockContent<"key_value">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  const [rows, setRows] = useState(
    content.rows.length ? content.rows : [{ label: "", value: "" }],
  );

  function update(i: number, field: "label" | "value", value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          rows: rows.filter((r) => r.label.trim() !== "" && r.value.trim() !== ""),
        });
      }}
      className="space-y-3"
    >
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={row.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="Label, e.g. Banke Bihari Mandir"
              className="h-10"
            />
            <Input
              value={row.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value, e.g. 900 m — 12 min walk"
              className="h-10"
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove row"
              className="text-danger hover:bg-danger/10 pressable flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { label: "", value: "" }])}
          className="hover:bg-surface-subtle pressable flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add row
        </button>
      </div>

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
