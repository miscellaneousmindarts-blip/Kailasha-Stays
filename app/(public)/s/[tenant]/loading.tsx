/**
 * The homepage is the one route that most needed this and didn't have it: it
 * is force-dynamic (the hero swaps its H1 on `?src=`), so every navigation to
 * it — and every cold request — used to hold the previous screen, unchanged
 * and unannotated, for the entire render. Measured at ~2–3s on production
 * before this file existed, against ~150ms for /properties, which differed
 * only in having a loading boundary.
 *
 * The hero is one solid block rather than an outline of its text, matching
 * how properties/[slug]/loading.tsx stands in for its gallery image: the real
 * hero is a full-bleed photo, and skeleton bars drawn on a tinted panel to
 * mimic the headline came out near-invisible — .skeleton's fill and a light
 * tint are within a few percent of each other, so the whole screen just read
 * as blank. A solid block on the page background keeps the contrast the
 * shimmer needs to be legible as "loading" rather than "empty".
 */
export default function Loading() {
  return (
    <main aria-busy="true">
      {/* Hero — full-bleed, same commanding height as the real one. The
          important modifier is load-bearing: .skeleton lives in @layer
          utilities and sets rounded-md, so a plain `rounded-none` ties with
          it and loses, leaving rounded corners on an edge-to-edge block. */}
      <div className="skeleton h-[560px] w-full rounded-none! md:h-[620px]" />

      {/* The top of the next section, so the fold isn't a hard stop. */}
      <div className="container-page py-14 md:py-20">
        <div className="skeleton h-7 w-56 rounded-md" />
        <div className="skeleton mt-3 h-5 w-full max-w-lg rounded-sm" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[4/3] rounded-xl" />
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </main>
  );
}
