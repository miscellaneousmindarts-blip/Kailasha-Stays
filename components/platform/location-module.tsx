import { Eyebrow, Section } from "@/components/landing/primitives";
import { LOCATION_ICONS, type ResolvedPlatformLocation } from "@/lib/platform-sections";

/**
 * docs/apex-page-plan.md §S6. Deliberately ranges, not the exact "1.4 km"
 * figures the tenant sites state — those are measured from ONE property's
 * door, and the apex speaks for homes spread across Deoghar, so restating
 * one home's number as if it applied to all of them would be false for most
 * of them. A true range beats a precise-looking number that isn't.
 *
 * `promiseBefore`/`promiseAfter` are editable copy; `walkMinutes` is the
 * widest real walk-time across published properties (computed in
 * app/(platform)/page.tsx from live data, same as before this section
 * became editable) — kept as its own prop, not stored copy, specifically so
 * "{n}-minute walk" stays styled and can never drift from what's actually
 * published as homes are added.
 */
export function LocationModule({
  content,
  walkMinutes,
}: {
  content: ResolvedPlatformLocation;
  walkMinutes: number;
}) {
  return (
    <Section band="canvas">
      <Eyebrow en={content.eyebrow} hi={content.eyebrowHi} />

      <p className="font-display mx-auto mt-5 max-w-3xl text-center text-[22px] leading-[1.35] font-semibold md:text-[28px]">
        {content.promiseBefore}{" "}
        <span className="text-primary">{walkMinutes}-minute walk</span> {content.promiseAfter}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {content.items.map((item) => {
          const Icon = LOCATION_ICONS[item.icon];
          return (
            <div key={item.label} className="border-border rounded-xl border p-5">
              <Icon className="text-primary size-5" aria-hidden="true" />
              <p className="font-display mt-3 text-[19px] leading-snug font-semibold">
                {item.label}
              </p>
              <p className="tabular text-primary mt-1 text-[24px] font-semibold">
                {item.range}
              </p>
              <p className="text-text-muted mt-1 text-sm">{item.note}</p>
            </div>
          );
        })}
      </div>

      <p className="text-text-muted mx-auto mt-8 max-w-2xl text-center text-sm">{content.footNote}</p>
    </Section>
  );
}
