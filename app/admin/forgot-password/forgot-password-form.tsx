"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    ForgotPasswordState,
    FormData
  >(requestPasswordReset, undefined);

  if (state?.sent) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2
            className="text-success mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            If that address belongs to an admin account, a reset link is on its
            way. It expires in an hour — check spam if it doesn&apos;t arrive.
          </span>
        </p>
        <Link
          href="/admin/login"
          className="text-primary text-sm font-medium underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
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
            Sending…
          </>
        ) : (
          "Email me a reset link"
        )}
      </button>

      <Link
        href="/admin/login"
        className="text-text-muted block text-center text-sm underline-offset-2 hover:underline"
      >
        Back to sign in
      </Link>
    </form>
  );
}
