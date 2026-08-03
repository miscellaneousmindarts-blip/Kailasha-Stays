"use client";

/**
 * The admin's one tab strip. Extracted from the property editor, which had
 * been the only screen using this pattern — Settings scrolled instead, which
 * is why it grew to five screens of unrelated forms.
 *
 * Horizontally scrollable on purpose: at 375px an eleven-tab property editor
 * can't wrap without eating the whole viewport, and a scrolling strip keeps
 * the first tabs visible as an affordance that more exist.
 */
export function SectionTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  /** Names the tablist for screen readers, e.g. "Settings sections". */
  label: string;
}) {
  return (
    <div className="border-border overflow-x-auto border-b">
      <div role="tablist" aria-label={label} className="no-scrollbar flex min-w-max gap-1">
        {tabs.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab)}
              className={`pressable flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap ${
                selected
                  ? "border-primary text-primary"
                  : "text-text-muted hover:text-foreground border-transparent"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
