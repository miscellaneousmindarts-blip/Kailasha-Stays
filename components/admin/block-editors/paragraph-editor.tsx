"use client";

import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import type { BlockContent } from "@/lib/blocks";

export function ParagraphEditor({
  content,
  onSave,
  pending,
  error,
  saved,
}: {
  content: BlockContent<"paragraph">;
  onSave: (content: BlockContent<"paragraph">) => void;
  pending: boolean;
  error: string | null;
  saved: boolean;
}) {
  const [text, setText] = useState(content.text);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ text });
      }}
      className="space-y-3"
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Separate paragraphs with a blank line."
      />
      <SaveBar pending={pending} saved={saved} error={error} label="Save section" />
    </form>
  );
}
