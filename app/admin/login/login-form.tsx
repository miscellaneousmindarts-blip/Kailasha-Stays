"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

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
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/admin/forgot-password"
            className="text-text-muted text-sm underline-offset-2 hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
