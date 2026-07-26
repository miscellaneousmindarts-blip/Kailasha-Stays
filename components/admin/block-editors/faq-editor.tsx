"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import type { BlockContent } from "@/lib/blocks";

export function FaqEditor({
  content,
  onSave,
  pending,
  error,
  saved,
}: {
  content: BlockContent<"faq">;
  onSave: (content: BlockContent<"faq">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  const [items, setItems] = useState(
    content.items.length ? content.items : [{ q: "", a: "" }],
  );

  function update(i: number, field: "q" | "a", value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          items: items.filter((it) => it.q.trim() !== "" && it.a.trim() !== ""),
        });
      }}
      className="space-y-4"
    >
      {items.map((item, i) => (
        <div key={i} className="border-border space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={item.q}
              onChange={(e) => update(i, "q", e.target.value)}
              placeholder="Question"
              className="h-10"
            />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove question"
              className="text-danger hover:bg-danger/10 pressable flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
          <Textarea
            value={item.a}
            onChange={(e) => update(i, "a", e.target.value)}
            placeholder="Answer"
            rows={2}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { q: "", a: "" }])}
        className="hover:bg-surface-subtle pressable flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add question
      </button>

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
