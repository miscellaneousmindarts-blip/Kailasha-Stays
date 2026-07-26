import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Placeholder homepage. The designed landing page comes later (PLAN §7,
 * "Deferred") — for now this just gets visitors to the properties.
 */
export default function Home() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-primary uppercase">
        Vrindavan
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl md:text-5xl">
        A quiet, well-kept place to stay
      </h1>
      <p className="text-text-muted mt-4 max-w-lg text-lg">
        A few carefully looked-after apartments, close to the temples. Book
        directly with us — no booking fee.
      </p>
      <Link
        href="/properties"
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable mt-8 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium"
      >
        See the properties
        <ArrowRight className="size-5" aria-hidden="true" />
      </Link>
    </main>
  );
}
