import { Eyebrow, Section } from "@/components/landing/primitives";
import { LandingPropertyCard } from "@/components/landing/property-card";
import { WhatsAppLink } from "@/components/landing/actions";
import type { LandingProperty } from "@/lib/landing";

/**
 * Position 2, deliberately. Browsing is a low-commitment action — it costs
 * the visitor nothing and exposes no phone number — so it needs very little
 * trust to earn. Everything below this section exists to convince the people
 * who *didn't* click here.
 */
export function HomesSection({
  properties,
  waitlistHref,
  year,
}: {
  properties: LandingProperty[];
  waitlistHref: string | null;
  year: number;
}) {
  return (
    <Section id="homes" band="sand">
      <Eyebrow hi="हमारे घर" en="Our homes" />
      <h2 className="mt-3 max-w-2xl text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
        {properties.length} {properties.length === 1 ? "home" : "homes"}. Each one a
        full 2BHK, yours alone.
      </h2>
      <p className="text-text-muted mt-3 max-w-xl">
        Two bedrooms, a living room, a kitchen and two bathrooms — not a hotel
        room, and not shared with anyone.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {properties.map((property) => (
          <LandingPropertyCard
            key={property.id}
            property={property}
            section="homes"
          />
        ))}

        {/* Honest growth card — no invented inventory, just an opt-in. */}
        <div className="border-input bg-surface-subtle flex flex-col justify-center rounded-lg border border-dashed p-6">
          <h3 className="text-lg font-semibold">More homes opening in Deoghar</h3>
          <p className="text-text-muted mt-2 text-sm">
            We&apos;re adding more 2BHK apartments near the temple through {year}.
            Want first refusal for Shravan?
          </p>
          {waitlistHref ? (
            <WhatsAppLink
              href={waitlistHref}
              context="waitlist"
              className="mt-4 self-start"
            >
              Add me to the list
            </WhatsAppLink>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
