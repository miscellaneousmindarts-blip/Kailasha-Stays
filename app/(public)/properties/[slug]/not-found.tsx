import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <SearchX className="text-text-muted size-8" aria-hidden="true" />
      <h1 className="mt-4 text-2xl">We couldn&apos;t find that property</h1>
      <p className="text-text-muted mt-2 max-w-sm">
        It may have been removed, or the link might be incomplete.
      </p>
      <Link
        href="/properties"
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-6 inline-flex h-12 items-center rounded-md px-6 font-medium"
      >
        See all properties
      </Link>
    </main>
  );
}
