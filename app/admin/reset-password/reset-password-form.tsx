"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setNewPassword, type ResetPasswordState } from "./actions";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ResetPasswordState,
    FormData
  >(setNewPassword, undefined);
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="text-text-muted hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="text-text-muted text-xs">At least 8 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 w-full items-center justify-center gap-2 rounded-md font-medium disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Save new password"
        )}
      </button>
    </form>
  );
}
