export type ComparisonRow = {
  label: string;
  us: string;
  hotel: string;
  dharamshala: string;
};

/**
 * Extracted out of faq.tsx (docs/apex-page-plan.md §S7) so the apex homepage
 * can render the same "us vs hotel vs dharamshala" table without depending on
 * ResolvedFaq or the tenant homepage builder — this component takes plain
 * rows. faq.tsx now imports this instead of defining it locally; no
 * behaviour change there.
 */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (!rows.length) return null;

  return (
    <>
      {/* Table on md+, stacked cards on mobile — a 4-column table at 375px is
          unreadable, and this audience is on a phone. */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Compared with a typical hotel and a dharamshala
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left font-medium" />
              <th
                scope="col"
                className="border-primary bg-primary-tint text-primary rounded-t-md border border-b-0 p-2 text-left font-semibold"
              >
                Us
              </th>
              <th scope="col" className="text-text-muted p-2 text-left font-medium">
                Typical hotel
              </th>
              <th scope="col" className="text-text-muted p-2 text-left font-medium">
                Dharamshala
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className="border-border border-t">
                <th scope="row" className="p-2 text-left font-normal">
                  {row.label}
                </th>
                <td
                  className={`border-primary bg-primary-tint text-success border-x p-2 font-medium ${
                    i === rows.length - 1 ? "rounded-b-md border-b" : ""
                  }`}
                >
                  {row.us}
                </td>
                <td className="text-text-muted p-2">{row.hotel}</td>
                <td className="text-text-muted p-2">{row.dharamshala}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {[
          { name: "Us", key: "us" as const, highlight: true },
          { name: "Typical hotel", key: "hotel" as const, highlight: false },
          { name: "Dharamshala", key: "dharamshala" as const, highlight: false },
        ].map((col) => (
          <div
            key={col.name}
            className={`rounded-md border p-3 ${
              col.highlight ? "border-primary bg-primary-tint" : "border-border"
            }`}
          >
            <p className={`font-semibold ${col.highlight ? "text-primary" : ""}`}>
              {col.name}
            </p>
            <dl className="mt-2 space-y-1 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-text-muted">{row.label}</dt>
                  <dd className="shrink-0 text-right font-medium">{row[col.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
