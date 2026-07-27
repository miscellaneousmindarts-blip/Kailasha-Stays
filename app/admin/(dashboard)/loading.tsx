/**
 * Shared fallback for every admin route — they're all dynamic (session +
 * live data), so without this a navigation just freezes on the previous
 * screen. Deliberately generic: a heading, a few stat tiles and a list,
 * which is the shape of most pages here.
 */
export default function Loading() {
  return (
    <div className="max-w-2xl" aria-busy="true">
      <div className="skeleton h-8 w-44" />
      <div className="skeleton mt-2 h-5 w-72" />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-border rounded-lg border p-4">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton mt-2 h-7 w-10" />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="skeleton h-6 w-56" />
        <div className="border-border divide-border mt-3 divide-y rounded-lg border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton mt-2 h-4 w-1/3" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
