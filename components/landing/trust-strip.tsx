import { Check, Star } from "lucide-react";

import type { ResolvedTrustRibbon } from "@/lib/homepage";

const ICONS = { check: Check, star: Star } as const;

/**
 * Proof before persuasion — social proof above the fold is a top-five CRO
 * lever, so this sits immediately under the hero on every page.
 */
export function TrustRibbon({ resolved }: { resolved: ResolvedTrustRibbon }) {
  if (!resolved.items.length) return null;

  return (
    <div className="bg-surface-subtle border-border border-y">
      <ul className="container-page no-scrollbar flex gap-5 overflow-x-auto py-3 text-sm whitespace-nowrap">
        {resolved.items.map((item, i) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={i} className="flex shrink-0 items-center gap-1.5">
              <Icon
                className={`size-4 ${item.icon === "star" ? "text-warning fill-current" : "text-success"}`}
                aria-hidden="true"
              />
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
