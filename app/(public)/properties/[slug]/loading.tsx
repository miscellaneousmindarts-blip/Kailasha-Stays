export default function Loading() {
  return (
    <main className="container-page py-6 md:py-10" aria-busy="true">
      <div className="skeleton mb-4 h-9 w-2/3 max-w-md rounded-md" />
      <div className="skeleton aspect-[4/3] rounded-lg md:aspect-[2/1]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-12">
        <div className="space-y-4">
          <div className="skeleton h-6 w-1/3 rounded-sm" />
          <div className="skeleton h-4 w-full rounded-sm" />
          <div className="skeleton h-4 w-11/12 rounded-sm" />
          <div className="skeleton h-4 w-4/5 rounded-sm" />
        </div>
        <div className="skeleton h-44 rounded-lg" />
      </div>
      <span className="sr-only">Loading property…</span>
    </main>
  );
}
