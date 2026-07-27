import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset admin password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage(
  props: PageProps<"/admin/forgot-password">,
) {
  const { expired } = await props.searchParams;

  return (
    <main className="bg-surface-subtle flex min-h-dvh items-center justify-center p-6">
      <div className="bg-background shadow-card w-full max-w-sm rounded-lg p-8">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-text-muted mt-1 text-sm">
          We&apos;ll email you a link to set a new one.
        </p>

        {expired ? (
          <p
            role="alert"
            className="border-danger/30 bg-danger/5 text-danger mt-4 rounded-md border p-3 text-sm"
          >
            That reset link has expired or was already used. Request a new one
            below.
          </p>
        ) : null}

        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
