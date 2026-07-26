import { ArrowUpRight } from "lucide-react";

import type { BlockContent } from "@/lib/blocks";

export function LinkListBlock({
  content,
}: {
  content: BlockContent<"link_list">;
}) {
  return (
    <ul className="grid max-w-3xl gap-3 sm:grid-cols-2">
      {content.links.map((link, i) => (
        <li key={i}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:border-primary/40 hover:shadow-card pressable flex min-h-14 items-start gap-3 rounded-md border p-4"
          >
            <span className="flex-1">
              <span className="block font-medium">{link.label}</span>
              {link.note ? (
                <span className="text-text-muted mt-0.5 block text-sm">
                  {link.note}
                </span>
              ) : null}
            </span>
            <ArrowUpRight
              className="text-text-muted mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
