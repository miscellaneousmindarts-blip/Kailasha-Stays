"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createListing, type CreateListingState } from "./actions";

export function NewListingForm() {
  const [state, formAction, pending] = useActionState<
    CreateListingState,
    FormData
  >(createListing, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Property title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. Riverside 2BHK on Parikrama Marg"
          className="h-11"
        />
        <p className="text-text-muted text-sm">
          You can change this and everything else after creating the listing.
        </p>
      </div>

      {state?.error ? (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Creating…
          </>
        ) : (
          "Create listing"
        )}
      </button>
    </form>
  );
}
