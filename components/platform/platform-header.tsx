"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/**
 * The apex's own header (docs/apex-page-plan.md §S1) — deliberately not
 * SiteHeader: that component is tenant-branded (one logo, one WhatsApp
 * number, "Properties" as the only nav item) and the apex nav is a different
 * shape entirely (Stays / Guides / a host CTA, WhatsApp moved to the sticky
 * bottom bar instead of the header).
 *
 * `logoSrc` is nullable on purpose — until the platform logo exists on disk
 * (lib/platform-assets.ts checks the filesystem), this renders the wordmark
 * as text instead of a broken image. Drop the real file in and it upgrades
 * automatically, no code change.
 */
export function PlatformHeader({
  logoSrc,
  guidesReady,
}: {
  logoSrc: string | null;
  /** Guides nav item only renders once /guides/ exists (Part B / B1a) — a
   *  link to a page that isn't built yet is worse than no link at all. */
  guidesReady: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3 md:h-[72px]">
          <Link href="/" className="min-w-0 shrink-0" aria-label="Deoghar BnB — home">
            {logoSrc ? (
              <span className="relative block h-8 w-[130px] md:h-9 md:w-[150px]">
                <Image
                  src={logoSrc}
                  alt="Deoghar BnB"
                  fill
                  sizes="150px"
                  priority
                  className="object-contain object-left"
                />
              </span>
            ) : (
              <span className="font-display block text-lg font-semibold tracking-tight">
                Deoghar BnB
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#homes" className="text-sm font-medium">
              Stays
            </a>
            {guidesReady ? (
              <Link href="/guides" className="text-sm font-medium">
                Guides
              </Link>
            ) : null}
            <a
              href="#for-owners"
              className="border-border hover:bg-surface-subtle pressable flex h-9 items-center rounded-full border px-4 text-sm font-medium"
            >
              List your property
            </a>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-md md:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Portalled to document.body rather than rendered inline: the header
          above has backdrop-blur-md (a backdrop-filter), which — like
          transform, filter or will-change — establishes a new containing
          block for any `position: fixed` descendant. Nested inside the
          header, this overlay's "fixed inset-0" resolved against the
          header's own ~64px box instead of the viewport: a drawer squashed
          into the top 64px of the screen, with the backdrop only dimming
          that same sliver. Rendering it into body sidesteps the header
          entirely, so `fixed` means the viewport again. */}
      {menuOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-[rgba(26,26,26,0.4)]"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="bg-background shadow-overlay absolute inset-y-0 right-0 flex w-[280px] max-w-[85vw] flex-col p-5">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center self-end rounded-md"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
                <nav className="mt-4 flex flex-col gap-1">
                  <a
                    href="#homes"
                    onClick={() => setMenuOpen(false)}
                    className="hover:bg-surface-subtle flex h-12 items-center rounded-md px-3 font-medium"
                  >
                    Stays
                  </a>
                  {guidesReady ? (
                    <Link
                      href="/guides"
                      onClick={() => setMenuOpen(false)}
                      className="hover:bg-surface-subtle flex h-12 items-center rounded-md px-3 font-medium"
                    >
                      Guides
                    </Link>
                  ) : null}
                  <a
                    href="#for-owners"
                    onClick={() => setMenuOpen(false)}
                    className="hover:bg-surface-subtle flex h-12 items-center rounded-md px-3 font-medium"
                  >
                    List your property
                  </a>
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
