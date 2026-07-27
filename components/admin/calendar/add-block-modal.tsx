"use client";

import { Loader2 } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveAction } from "@/components/admin/use-save-action";
import { addManualBlock } from "@/app/admin/(dashboard)/calendar/actions";
import { addDays, toISODate } from "@/lib/date-utils";

export function AddBlockModal({
  propertyId,
  initialDate,
  onClose,
  onAdded,
}: {
  propertyId: string;
  initialDate: Date;
  onClose: () => void;
  onAdded: () => void;
}) {
  const action = useSaveAction(addManualBlock);

  return (
    <ResponsiveModal open onClose={onClose} title="Add manual block">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await action.runAndWait(propertyId, new FormData(e.currentTarget));
          if (ok) onAdded();
        }}
        className="space-y-4"
      >
        <p className="text-text-muted text-sm">
          Blocks these dates for this property — useful for maintenance, your
          own stays, or holding a date while you confirm something offline.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="check_in">Check-in</Label>
            <Input
              id="check_in"
              name="check_in"
              type="date"
              defaultValue={toISODate(initialDate)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="check_out">Check-out</Label>
            <Input
              id="check_out"
              name="check_out"
              type="date"
              defaultValue={toISODate(addDays(initialDate, 1))}
              required
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>
        {action.error ? (
          <p role="alert" className="text-danger text-sm">
            {action.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={action.pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-12 w-full items-center justify-center gap-2 rounded-md font-medium disabled:opacity-60"
        >
          {action.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Add block
        </button>
      </form>
    </ResponsiveModal>
  );
}
