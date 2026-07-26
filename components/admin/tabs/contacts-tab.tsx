"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  addContact,
  deleteContact,
  moveContact,
  updateContact,
} from "@/app/admin/(dashboard)/listings/[id]/actions";
import type { PropertyContact } from "@/lib/types/database";

function ContactRow({
  propertyId,
  contact,
  isFirst,
  isLast,
}: {
  propertyId: string;
  contact: PropertyContact;
  isFirst: boolean;
  isLast: boolean;
}) {
  const update = useSaveAction(updateContact);
  const del = useSaveAction(deleteContact);
  const move = useSaveAction(moveContact);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update.run(propertyId, contact.id, new FormData(e.currentTarget));
      }}
      className="border-border space-y-3 border-b p-4 last:border-b-0"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`name-${contact.id}`}>Name</Label>
          <Input id={`name-${contact.id}`} name="name" defaultValue={contact.name} required className="h-11" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`role-${contact.id}`}>Role</Label>
          <Input
            id={`role-${contact.id}`}
            name="role"
            defaultValue={contact.role ?? ""}
            placeholder="Caretaker"
            className="h-11"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`phone-${contact.id}`}>Phone</Label>
          <Input id={`phone-${contact.id}`} name="phone" defaultValue={contact.phone} required className="h-11" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <Checkbox name="show_to_guest" defaultChecked={contact.show_to_guest} />
          Show to guest
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move.run(propertyId, contact.id, "up")}
            disabled={isFirst || move.pending}
            aria-label="Move up"
            className="hover:bg-surface-subtle pressable flex size-11 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move.run(propertyId, contact.id, "down")}
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
            {update.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Save"}
          </button>
          <button
            type="button"
            onClick={() => del.run(propertyId, contact.id)}
            disabled={del.pending}
            aria-label="Delete contact"
            className="text-danger hover:bg-danger/10 pressable flex size-11 items-center justify-center rounded-full"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {update.error ? <p role="alert" className="text-danger text-sm">{update.error}</p> : null}
    </form>
  );
}

function AddContactForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const add = useSaveAction(addContact);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-surface-subtle pressable flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed font-medium"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add contact
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const ok = await add.runAndWait(propertyId, formData);
        if (ok) setOpen(false);
      }}
      className="border-border space-y-3 rounded-md border p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">New contact</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="hover:bg-surface-subtle pressable flex size-9 items-center justify-center rounded-full"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="name" placeholder="Name" required className="h-11" />
        <Input name="role" placeholder="Role (e.g. Caretaker)" className="h-11" />
        <Input name="phone" placeholder="Phone" required className="h-11" />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <Checkbox name="show_to_guest" defaultChecked />
        Show to guest
      </label>
      {add.error ? <p role="alert" className="text-danger text-sm">{add.error}</p> : null}
      <button
        type="submit"
        disabled={add.pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
      >
        {add.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Add"}
      </button>
    </form>
  );
}

export function ContactsTab({
  propertyId,
  contacts,
}: {
  propertyId: string;
  contacts: PropertyContact[];
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-text-muted text-sm">
        Caretaker, host and other numbers guests can reach. Contacts marked
        &quot;Show to guest&quot; appear in the guest portal after booking.
      </p>

      {contacts.length ? (
        <div className="border-border rounded-md border">
          {contacts.map((c, i) => (
            <ContactRow
              key={c.id}
              propertyId={propertyId}
              contact={c}
              isFirst={i === 0}
              isLast={i === contacts.length - 1}
            />
          ))}
        </div>
      ) : null}

      <AddContactForm propertyId={propertyId} />
    </div>
  );
}
