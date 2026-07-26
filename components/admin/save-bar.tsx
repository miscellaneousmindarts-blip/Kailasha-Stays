import { Check, Loader2 } from "lucide-react";

export function SaveBar({
  pending,
  saved,
  error,
  label = "Save changes",
}: {
  pending: boolean;
  saved: boolean;
  error: string | null;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {label}
      </button>
      {saved ? (
        <span className="text-success flex items-center gap-1.5 text-sm font-medium">
          <Check className="size-4" aria-hidden="true" />
          Saved
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-danger text-sm">
          {error}
        </span>
      ) : null}
    </div>
  );
}
