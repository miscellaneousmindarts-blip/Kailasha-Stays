"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error?: string } | undefined;

const MIN_LENGTH = 8;

export async function setNewPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_LENGTH) {
    return { error: `Use at least ${MIN_LENGTH} characters.` };
  }
  if (password !== confirm) {
    return { error: "Those two passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The recovery link established this session — no session means the link
  // expired, was already used, or the page was opened directly.
  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/admin");
}
