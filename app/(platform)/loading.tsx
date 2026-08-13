/**
 * Same reasoning as app/(public)/s/[tenant]/loading.tsx: the apex became
 * dynamic the moment it started querying properties (getPlatformProperties()
 * in page.tsx), and per docs/audit-2026-08.md a dynamic route with no
 * loading boundary holds the previous screen, frozen, for the entire render.
 *
 * Shape matches the tenant homepage's own loading state — full-bleed hero
 * block, then the top of the next section — since the apex hero (§S2) is the
 * same full-bleed treatment. A header bar is added since the apex's own
 * PlatformHeader is sticky and would otherwise pop in abruptly once content
 * arrives.
 */
export default function Loading() {
  return (
    <>
      <div className="border-border bg-background/85 sticky top-0 z-40 h-16 border-b backdrop-blur-md md:h-[72px]">
        <div className="container-page flex h-full items-center">
          <div className="skeleton h-8 w-[130px] md:h-9 md:w-[150px]" />
        </div>
      </div>

      <main aria-busy="true">
        {/* Hero — full-bleed, same commanding height as the real one. The
            important modifier is load-bearing: .skeleton lives in @layer
            utilities and sets rounded-md, so a plain `rounded-none` ties
            with it and loses, leaving rounded corners on an edge-to-edge
            block (see the tenant homepage's own loading.tsx for the same
            note). */}
        <div className="skeleton h-[560px] w-full rounded-none! md:h-[620px]" />

        {/* The top of the homes grid, so the fold isn't a hard stop. */}
        <div className="container-page py-14 md:py-24">
          <div className="skeleton h-4 w-40 rounded-sm" />
          <div className="skeleton mt-4 h-5 w-full max-w-lg rounded-sm" />
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[4/3] rounded-lg" />
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded-sm" />
                  <div className="skeleton h-4 w-1/2 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <span className="sr-only">Loading…</span>
      </main>
    </>
  );
}
