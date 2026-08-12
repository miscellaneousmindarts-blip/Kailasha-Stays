/**
 * The guest portal is force-dynamic (live billing, add-on status, document
 * uploads) and resolves its whole bundle through one RPC, so there was
 * nothing on screen until that round trip finished. A guest opening their
 * booking link from WhatsApp on a phone is the least patient audience the app
 * has and the one most likely to be on a slow connection.
 *
 * Shaped like components/guest-portal/portal-header.tsx and the section stack
 * in the page below it: confirmation banner, property card, guest line, then
 * a few section blocks.
 */
export default function Loading() {
  return (
    <main className="container-page max-w-2xl py-6 md:py-10" aria-busy="true">
      {/* Confirmation banner */}
      <div className="skeleton h-[86px] w-full rounded-lg" />

      {/* Property card — same 16/9-ish block the real header renders. */}
      <div className="skeleton mt-4 aspect-[16/10] w-full rounded-lg sm:aspect-[2/1]" />

      {/* Guest name / dates / guests line */}
      <div className="mt-4 space-y-2">
        <div className="skeleton h-5 w-40 rounded-sm" />
        <div className="skeleton h-5 w-full max-w-sm rounded-sm" />
        <div className="skeleton h-5 w-24 rounded-sm" />
      </div>

      {/* Getting there → documents → billing, as stacked bordered sections. */}
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="border-border mt-6 border-t pt-6">
          <div className="flex items-center gap-2">
            <div className="skeleton size-5 rounded-full" />
            <div className="skeleton h-6 w-40 rounded-sm" />
          </div>
          <div className="skeleton mt-3 h-5 w-full max-w-md rounded-sm" />
          <div className="skeleton mt-2 h-11 w-full rounded-md" />
        </section>
      ))}

      <span className="sr-only">Loading your booking…</span>
    </main>
  );
}
