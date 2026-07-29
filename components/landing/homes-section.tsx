import { Eyebrow, Section } from "@/components/landing/primitives";
import { LandingPropertyCard } from "@/components/landing/property-card";
import type { LandingProperty } from "@/lib/landing";

/**
 * Position 2, deliberately. Browsing is a low-commitment action — it costs
 * the visitor nothing and exposes no phone number — so it needs very little
 * trust to earn. Everything below this section exists to convince the people
 * who *didn't* click here.
 */
export function HomesSection({ properties }: { properties: LandingProperty[] }) {
  // Describe what's actually listed. "Each one a full 2BHK" was false the
  // moment a one-bedroom studio joined the page, and an overclaim here poisons
  // every honesty promise made further down.
  const beds = properties.map((p) => p.bedrooms);
  const allTwoBed = beds.length > 0 && beds.every((b) => b >= 2);
  const capacities = properties.map((p) => p.sleeps);
  const sleepsRange =
    capacities.length === 0
      ? null
      : Math.min(...capacities) === Math.max(...capacities)
        ? `${capacities[0]}`
        : `${Math.min(...capacities)}–${Math.max(...capacities)}`;

  return (
    <Section id="homes" band="sand">
      <Eyebrow hi="हमारे घर" en="Our homes" />
      <h2 className="mt-3 max-w-2xl text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
        {properties.length} {properties.length === 1 ? "home" : "homes"}.
        {allTwoBed ? " Each one a full 2BHK, yours alone." : " Each one yours alone."}
      </h2>
      <p className="text-text-muted mt-3 max-w-xl">
        A whole apartment to yourselves
        {sleepsRange ? `, sleeping ${sleepsRange}` : ""} — not a hotel room, and
        not shared with anyone.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {properties.map((property) => (
          <LandingPropertyCard
            key={property.id}
            property={property}
            section="homes"
          />
        ))}
      </div>
    </Section>
  );
}
