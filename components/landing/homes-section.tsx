import { Eyebrow, Section } from "@/components/landing/primitives";
import { LandingPropertyCard } from "@/components/landing/property-card";
import type { LandingProperty } from "@/lib/landing";
import type { ResolvedHomes } from "@/lib/homepage";

/**
 * Position 2, deliberately. Browsing is a low-commitment action — it costs
 * the visitor nothing and exposes no phone number — so it needs very little
 * trust to earn. Everything below this section exists to convince the people
 * who *didn't* click here.
 */
export function HomesSection({
  properties,
  resolved,
}: {
  properties: LandingProperty[];
  resolved: ResolvedHomes;
}) {
  return (
    <Section id="homes" band="sand">
      <Eyebrow hi={resolved.eyebrowHi} en={resolved.eyebrow} />
      <h2 className="mt-3 max-w-2xl font-display text-[26px] leading-[1.15] font-semibold md:text-[36px]">
        {resolved.heading}
      </h2>
      {resolved.lede ? (
        <p className="text-text-muted mt-3 max-w-xl">{resolved.lede}</p>
      ) : null}

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
