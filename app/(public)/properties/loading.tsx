import { PropertyCardSkeleton } from "@/components/property-card";

export default function Loading() {
  return (
    <main className="container-page py-10 md:py-14" aria-busy="true">
      <div className="bg-surface-subtle h-10 w-72 rounded-md" />
      <div className="bg-surface-subtle mt-4 h-6 w-full max-w-xl rounded-sm" />
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
      <span className="sr-only">Loading properties…</span>
    </main>
  );
}
