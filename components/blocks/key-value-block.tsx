import type { BlockContent } from "@/lib/blocks";

export function KeyValueBlock({
  content,
}: {
  content: BlockContent<"key_value">;
}) {
  return (
    <dl className="max-w-2xl">
      {content.rows.map((row, i) => (
        <div
          key={i}
          className="border-border flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3 last:border-b-0"
        >
          <dt className="font-medium">{row.label}</dt>
          <dd className="text-text-muted tabular">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
