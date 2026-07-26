"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/admin/save-bar";
import type { BlockContent } from "@/lib/blocks";

export function LinkListEditor({
  content,
  onSave,
  pending,
  error,
  saved,
}: {
  content: BlockContent<"link_list">;
  onSave: (content: BlockContent<"link_list">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  const [links, setLinks] = useState(
    content.links.length ? content.links : [{ label: "", url: "", note: "" }],
  );

  function update(i: number, field: "label" | "url" | "note", value: string) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const cleaned = links
          .filter((l) => l.label.trim() !== "" && l.url.trim() !== "")
          .map((l) => ({ ...l, note: l.note?.trim() || undefined }));
        onSave({ links: cleaned });
      }}
      className="space-y-3"
    >
      {links.map((link, i) => (
        <div key={i} className="border-border space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={link.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="Label"
              className="h-10"
            />
            <button
              type="button"
              onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove link"
              className="text-danger hover:bg-danger/10 pressable flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
          <Input
            value={link.url}
            onChange={(e) => update(i, "url", e.target.value)}
            placeholder="https://..."
            type="url"
            className="h-10"
          />
          <Input
            value={link.note ?? ""}
            onChange={(e) => update(i, "note", e.target.value)}
            placeholder="Note (optional)"
            className="h-10"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setLinks((prev) => [...prev, { label: "", url: "", note: "" }])}
        className="hover:bg-surface-subtle pressable flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add link
      </button>

      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
