/**
 * Superadmin loads two lists over the network before rendering anything.
 * Low traffic, but it's the one screen with no other feedback at all — the
 * layout is a bare shell, so without this the whole viewport stayed on the
 * previous route.
 *
 * Shaped like page.tsx: a titled tenant list, then a secondary section.
 */
export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true">
      <div>
        <div className="skeleton h-8 w-36 rounded-md" />
        <div className="skeleton mt-2 h-5 w-full max-w-2xl rounded-sm" />

        <div className="border-border divide-border mt-6 divide-y rounded-lg border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-5 w-48 rounded-sm" />
                <div className="skeleton mt-2 h-4 w-32 rounded-sm" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <section className="border-border border-t pt-8">
        <div className="skeleton h-6 w-32 rounded-md" />
        <div className="skeleton mt-2 h-5 w-full max-w-xl rounded-sm" />
        <div className="skeleton mt-4 h-11 w-full max-w-sm rounded-md" />
      </section>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
