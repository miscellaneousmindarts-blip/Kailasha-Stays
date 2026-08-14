"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveAction } from "@/components/admin/use-save-action";
import { createTenant } from "@/app/superadmin/actions";
import { publicEnv } from "@/lib/env";
import { TENANT_PLAN_LABEL, TENANT_PLANS } from "@/lib/superadmin/types";
import type { TenantPlan } from "@/lib/types/database";

export function CreateTenantForm() {
  const action = useSaveAction(createTenant);
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  // 'listing' default matches the column's own default (0027) — most new
  // tenants start here; a branded site is the deliberate upgrade.
  const [plan, setPlan] = useState<TenantPlan>("listing");

  // Shown as a preview only — the server derives and de-duplicates the real
  // slug, so this can be a rough guess without risking a mismatch.
  const previewSlug =
    (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "…";
  const platformDomain = publicEnv.platformDomains[0];

  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await action.runAndWait(new FormData(e.currentTarget));
        if (ok) {
          setName("");
          setSlug("");
          setOwnerEmail("");
          setPlan("listing");
          formRef.current?.reset();
        }
      }}
      className="max-w-xl space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="tenant_plan">Plan</Label>
        <select
          id="tenant_plan"
          name="plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value as TenantPlan)}
          className="border-border h-11 w-full rounded-md border bg-transparent px-3"
        >
          {TENANT_PLANS.map((p) => (
            <option key={p} value={p}>
              {TENANT_PLAN_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant_name">Business name</Label>
          <Input
            id="tenant_name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Riverside Homestays"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant_slug">URL slug (optional)</Label>
          <Input
            id="tenant_slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="riverside-homestays"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_email">Owner email (optional)</Label>
        <Input
          id="owner_email"
          name="owner_email"
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="owner@example.com"
          className="h-11"
        />
        <p className="text-text-muted text-xs">
          Sends them an invite to set a password and sign in. Leave blank to add an owner later
          from the tenant&apos;s row.
        </p>
      </div>

      <p className="text-text-muted text-sm">
        {plan === "branded" ? (
          <>
            Their site will be at{" "}
            <code className="bg-surface-subtle rounded px-1 py-0.5">
              {platformDomain ? `${previewSlug}.${platformDomain}` : `/s/${previewSlug}`}
            </code>
            . A number is appended if that&apos;s already taken. Changeable later from Edit
            details.
          </>
        ) : (
          <>
            No site of their own — their properties list on{" "}
            <code className="bg-surface-subtle rounded px-1 py-0.5">
              {platformDomain ?? "the apex"}
            </code>{" "}
            once published. They still get a full admin login. Changeable later from Edit details.
          </>
        )}
      </p>

      {action.error ? (
        <p role="alert" className="text-danger text-sm">
          {action.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={action.pending || !name.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-11 items-center gap-2 rounded-md px-5 font-medium disabled:opacity-60"
        >
          {action.pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Create tenant
        </button>
        {action.saved ? (
          <span className="text-success text-sm font-medium">Created</span>
        ) : null}
      </div>
    </form>
  );
}
