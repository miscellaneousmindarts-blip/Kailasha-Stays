"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addAddonService,
  deleteAddonService,
  moveAddonService,
  updateAddonService,
} from "@/app/admin/(dashboard)/settings/actions";
import type { AddonService } from "@/lib/types/database";

function AddonRow({
  addon,
  isFirst,
  isLast,
}: {
  addon: AddonService;
  isFirst: boolean;
  isLast: boolean;
}) {
  const update = useSaveAction(updateAddonService);
  const del = useSaveAction(deleteAddonService);
  const move = useSaveAction(moveAddonService);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update.run(addon.id, new FormData(e.currentTarget));
      }}
      className="border-border space-y-3 border-b p-4 last:border-b-0"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
        <div className="space-y-1">
          <Label htmlFor={`name-${addon.id}`}>Name</Label>
          <Input
            id={`name-${addon.id}`}
            name="name"
            defaultValue={addon.name}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`price-${addon.id}`}>Price (₹)</Label>
          <Input
            id={`price-${addon.id}`}
            name="price"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={addon.price ?? ""}
            className="h-11"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`unit-${addon.id}`}>Unit</Label>
          <Input
            id={`unit-${addon.id}`}
            name="price_unit"
            placeholder="per booking"
            defaultValue={addon.price_unit ?? ""}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`desc-${addon.id}`}>Description</Label>
        <Input
          id={`desc-${addon.id}`}
          name="description"
          defaultValue={addon.description ?? ""}
          className="h-11"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <Checkbox name="active" defaultChecked={addon.active} />
          Active
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move.run(addon.id, "up")}
            disabled={isFirst || move.pending}
            aria-label="Move up"
            className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move.run(addon.id, "down")}
            disabled={isLast || move.pending}
            aria-label="Move down"
            className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
          <button
            type="submit"
            disabled={update.pending}
            className="border-border hover:bg-surface-subtle pressable ml-2 flex h-11 items-center rounded-md border px-4 text-sm font-medium"
          >
            {update.pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              "Save"
            )}
          </button>
          <button
            type="button"
            onClick={() => del.run(addon.id)}
            disabled={del.pending}
            aria-label={`Delete ${addon.name}`}
            className="text-danger hover:bg-danger/10 pressable flex size-11 items-center justify-center rounded-full"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {update.error ? (
        <p role="alert" className="text-danger text-sm">
          {update.error}
        </p>
      ) : null}
      {del.error ? (
        <p role="alert" className="text-danger text-sm">
          {del.error}
        </p>
      ) : null}
    </form>
  );
}

function AddAddonForm() {
  const [open, setOpen] = useState(false);
  const add = useSaveAction(addAddonService);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed font-medium"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add to catalog
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const ok = await add.runAndWait(new FormData(form));
        if (ok) {
          form.reset();
          setOpen(false);
        }
      }}
      className="border-border space-y-3 rounded-md border p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">New add-on</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
        <Input name="name" placeholder="Name" required className="h-11" />
        <Input
          name="price"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Price (₹)"
          className="h-11"
        />
        <Input name="price_unit" placeholder="per booking" className="h-11" />
      </div>
      <Input name="description" placeholder="Description (optional)" className="h-11" />

      {add.error ? (
        <p role="alert" className="text-danger text-sm">
          {add.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={add.pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
      >
        {add.pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          "Add"
        )}
      </button>
    </form>
  );
}

export function AddonCatalogPanel({ addons }: { addons: AddonService[] }) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-text-muted text-sm">
        Services guests can add to a stay — car rental, pooja arrangements,
        meals. This is the shared list; choose which of these each property
        actually offers from that listing&apos;s{" "}
        <span className="font-medium">Add-ons</span> tab.
      </p>

      {addons.length ? (
        <div className="border-border rounded-md border">
          {addons.map((a, i) => (
            <AddonRow
              key={a.id}
              addon={a}
              isFirst={i === 0}
              isLast={i === addons.length - 1}
            />
          ))}
        </div>
      ) : (
        <p className="text-text-muted border-border rounded-md border border-dashed p-4 text-sm">
          No add-ons yet.
        </p>
      )}

      <AddAddonForm />
    </div>
  );
}
