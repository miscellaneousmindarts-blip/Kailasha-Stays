import { Check } from "lucide-react";

import type { BlockContent } from "@/lib/blocks";

export function ListBlock({ content }: { content: BlockContent<"list"> }) {
  if (content.style === "number") {
    return (
      <ol className="max-w-prose space-y-3">
        {content.items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="bg-primary-tint text-primary tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="max-w-prose space-y-3">
      {content.items.map((item, i) => (
        <li key={i} className="flex gap-3">
          {content.style === "check" ? (
            <Check
              className="text-primary mt-1 size-5 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <span
              className="bg-text-muted mt-2.5 size-1.5 shrink-0 rounded-full"
              aria-hidden="true"
            />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
