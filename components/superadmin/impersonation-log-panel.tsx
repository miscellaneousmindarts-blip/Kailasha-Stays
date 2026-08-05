import { formatDate } from "@/lib/format";
import type { ImpersonationEntry } from "@/lib/superadmin/types";

function when(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)}, ${time}`;
}

export function ImpersonationLogPanel({ entries }: { entries: ImpersonationEntry[] }) {
  if (!entries.length) {
    return (
      <div className="border-border rounded-lg border border-dashed p-8 text-center">
        <p className="text-text-muted text-sm">No support sessions recorded yet.</p>
      </div>
    );
  }

  return (
    <ul className="border-border divide-border divide-y rounded-lg border text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3">
          <span className="min-w-0">
            <span className="font-medium">{entry.actor_email ?? "Unknown"}</span>
            <span className="text-text-muted"> acted as </span>
            <span className="font-medium">{entry.tenant_slug}</span>
          </span>
          <span className="text-text-muted tabular shrink-0">
            {when(entry.started_at)}
            {entry.ended_at ? ` — ended ${when(entry.ended_at)}` : " · still open"}
          </span>
        </li>
      ))}
    </ul>
  );
}
