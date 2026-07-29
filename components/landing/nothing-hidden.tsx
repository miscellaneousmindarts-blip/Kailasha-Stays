import { ArrowDown } from "lucide-react";

import { ConfiguredImage, Eyebrow, Section } from "@/components/landing/primitives";
import { landingConfig } from "@/lib/landing-config";

/*
 * PHOTOGRAPHY BRIEF (also repeated in lib/landing-config.ts, where the paths
 * are filled in): daylight only, no filters that alter wall colour, no
 * wide-angle distortion, no stock imagery, and never publish a photo more
 * flattering than the room actually is.
 *
 * Priority: bathroom → kitchen → living room with people → made bedroom →
 * entrance and lock → exterior with signage → car with driver → temple view →
 * water tank and inverter.
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
    <Section band="sand">
      <Eyebrow hi="कुछ छुपाया नहीं" en="Nothing hidden" />
      <h2 className="mt-3 max-w-2xl text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
        We photograph the parts other listings don&apos;t.
      </h2>
      <p className="text-text-muted mt-3 max-w-xl">
        The bathroom. The water tank. Exactly what&apos;s on the counter. Look
        properly before you book — what you see is what you get.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {shots.map(({ image, caption }) => (
          <li key={caption}>
            <ConfiguredImage
              image={image}
              aspect="aspect-square"
              sizes="(max-width: 768px) 50vw, 320px"
            />
            <p className="text-text-muted mt-2 text-sm">{caption}</p>
          </li>
        ))}
      </ul>

      <p className="text-text-muted mt-8 flex flex-wrap items-center justify-center gap-3 text-center text-sm">
        Full photo sets are on each home&apos;s page.
        <a
          href="#homes"
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable inline-flex h-11 items-center gap-2 rounded-md px-5 font-medium"
        >
          See the homes
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </p>
    </Section>
  );
}
