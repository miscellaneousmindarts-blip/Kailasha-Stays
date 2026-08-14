import Link from "next/link";

import { PLATFORM_NAME, PLATFORM_NAP } from "@/lib/platform-content";
import type { PlatformProperty } from "@/lib/platform";

/**
 * docs/apex-page-plan.md §S14. Only links to pages that exist today —
 * Guides and Areas columns from the strategy doc are omitted entirely
 * (rather than shipping dead links) until those pages land (Part B).
 */
export function PlatformFooter({ properties }: { properties: PlatformProperty[] }) {
  return (
    <footer className="border-border border-t py-12 md:py-16">
      <div className="container-page grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold">{PLATFORM_NAME}</p>
          <p className="text-text-muted mt-2 max-w-xs text-sm leading-relaxed">
            Verified whole-flat homestays near Baba Baidyanath Dham, Deoghar. Book
            directly with the family who runs each home.
          </p>
        </div>

        {properties.length ? (
          <div>
            <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
              Stays
            </p>
            <ul className="mt-3 space-y-2">
              {properties.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/stays/${p.publicSlug}`}
                    className="text-sm hover:underline"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
            Company
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <a href="#for-owners" className="text-sm hover:underline">
                List your property
              </a>
            </li>
            <li>
              <a
                href={`tel:${PLATFORM_NAP.phone}`}
                className="text-sm hover:underline"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
            {PLATFORM_NAP.name}
          </p>
          <p className="mt-3 text-sm">{PLATFORM_NAP.locality}</p>
          <p className="mt-1 text-sm">{PLATFORM_NAP.phone}</p>
        </div>
      </div>
    </footer>
  );
}
