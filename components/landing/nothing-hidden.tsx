import { Photo } from "@/components/landing/primitives";
import type { ResolvedNothingHidden } from "@/lib/homepage";

/**
 * The one section that breaks the page grid. Everything else on this page sits
 * in the same 1280px column, which is what makes a landing page feel
 * machine-assembled — so the section whose entire argument is "look at the
 * photographs" is the one that gets to run full-bleed and let them fill the
 * screen.
 *
 * The photo count is unbounded — the admin can upload as many as they want —
 * so the grid has to work for any N, not just the original fixed six.
 * resolveNothingHidden() in lib/homepage.ts already hides the whole section
 * when zero photos resolve, so `resolved === null` is the only gate here.
 */
export function NothingHidden({ resolved }: { resolved: ResolvedNothingHidden | null }) {
  if (!resolved) return null;

  return (
    <section className="bg-surface-subtle py-14 md:py-24">
      <div className="container-page">
        <h2 className="font-display max-w-2xl text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          {resolved.heading}
        </h2>
        {resolved.lede ? (
          <p className="text-text-muted mt-3 max-w-xl">{resolved.lede}</p>
        ) : null}
      </div>

      {/* Full-bleed, edge to edge — the only place on the page that escapes
          the container. */}
      <ul className="mt-8 grid grid-cols-2 gap-1 md:mt-12 md:grid-cols-3">
        {resolved.photos.map(({ image }, i) => (
          <li key={i} className="relative">
            <Photo
              image={image}
              aspect={i === 0 ? "aspect-square md:aspect-[3/2]" : "aspect-square"}
              sizes="(max-width: 768px) 50vw, 33vw"
              rounded={false}
            />
            {image.title ? (
              <p className="text-text-muted px-3 py-2 text-sm">{image.title}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="container-page mt-10">
        <p className="text-text-muted text-sm">
          {resolved.footNote}{" "}
          <a
            href="#homes"
            className="text-primary font-medium underline-offset-2 hover:underline"
          >
            See the homes
          </a>
        </p>
      </div>
    </section>
  );
}
