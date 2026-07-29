import { ConfiguredImage } from "@/components/landing/primitives";
import { landingConfig } from "@/lib/landing-config";

/*
 * PHOTOGRAPHY BRIEF (repeated in public/images/landing/README.md, where the
 * files live): daylight only, no filters that alter wall colour, no
 * wide-angle distortion, no stock imagery, and never publish a photo more
 * flattering than the room actually is.
 *
 * Priority: bathroom → kitchen counter → living room with people → made
 * bedroom → entrance and lock → exterior with signage → car with driver →
 * water tank and inverter.
 */

/**
 * The one section that breaks the page grid. Everything else on this page sits
 * in the same 1280px column, which is what makes a landing page feel
 * machine-assembled — so the section whose entire argument is "look at the
 * photographs" is the one that gets to run full-bleed and let them fill the
 * screen.
 */
export function NothingHidden() {
  const { images } = landingConfig;
  const shots = [
    { image: images.bathroom, caption: "The bathroom, lights on" },
    { image: images.kitchen, caption: "The induction hob and water" },
    { image: images.utilities, caption: "Water tank and inverter" },
    { image: images.entrance, caption: "Your own door, your own key" },
    { image: images.exterior, caption: "The building from the road" },
    { image: images.car, caption: "The car, and the driver" },
  ];

  return (
    <section className="bg-surface-subtle py-14 md:py-24">
      <div className="container-page">
        <h2 className="font-display max-w-2xl text-[26px] leading-[1.15] font-semibold md:text-[36px]">
          We photograph the parts other listings don&apos;t.
        </h2>
        <p className="text-text-muted mt-3 max-w-xl">
          The bathroom. The water tank. Exactly what&apos;s on the counter. Look
          properly before you book: what you see is what you get.
        </p>
      </div>

      {/* Full-bleed, edge to edge — the only place on the page that escapes
          the container. */}
      <ul className="mt-8 grid grid-cols-2 gap-1 md:mt-12 md:grid-cols-3">
        {shots.map(({ image, caption }, i) => (
          <li key={caption} className="relative">
            <ConfiguredImage
              image={image}
              aspect={i === 0 ? "aspect-square md:aspect-[3/2]" : "aspect-square"}
              sizes="(max-width: 768px) 50vw, 33vw"
              rounded={false}
            />
            <p className="text-text-muted px-3 py-2 text-sm">{caption}</p>
          </li>
        ))}
      </ul>

      <div className="container-page mt-10">
        <p className="text-text-muted text-sm">
          Full photo sets are on each home&apos;s page.{" "}
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
