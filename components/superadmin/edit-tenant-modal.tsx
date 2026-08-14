"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateTenant } from "@/app/superadmin/actions";
import { TENANT_PLAN_LABEL, TENANT_PLANS, TENANT_STATUSES, type TenantRow } from "@/lib/superadmin/types";
import { publicEnv } from "@/lib/env";
import type { TenantPlan } from "@/lib/types/database";

export function EditTenantModal({
  tenant,
  onClose,
}: {
  tenant: TenantRow;
  onClose: () => void;
}) {
  const action = useSaveAction(updateTenant);
  const defaultDomain = publicEnv.platformDomains[0];

  const [plan, setPlan] = useState<TenantPlan>(tenant.plan);
  const [downgradeConfirmed, setDowngradeConfirmed] = useState(false);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);

  // Only branded -> listing is destructive (their live site goes dark).
  // listing -> branded, or no change at all, needs no confirmation step.
  const isDowngrading = tenant.plan === "branded" && plan === "listing";

  return (
    <ResponsiveModal open onClose={onClose} title={tenant.name}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (isDowngrading && !downgradeConfirmed) {
            setDowngradeError("Confirm you understand their site will go offline.");
            return;
          }
          setDowngradeError(null);
          const ok = await action.runAndWait(tenant.id, new FormData(e.currentTarget));
          if (ok) onClose();
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="edit_name">Business name</Label>
          <Input id="edit_name" name="name" defaultValue={tenant.name} required className="h-11" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit_slug">Slug</Label>
          <Input id="edit_slug" name="slug" defaultValue={tenant.slug} required className="h-11" />
          <p className="text-warning flex items-start gap-1.5 text-sm">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Changing this changes their live web address. Anyone using the old
            link will need the new one.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit_plan">Plan</Label>
          <select
            id="edit_plan"
            name="plan"
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value as TenantPlan);
              setDowngradeConfirmed(false);
              setDowngradeError(null);
            }}
            className="border-border h-11 w-full rounded-md border bg-transparent px-3"
          >
            {TENANT_PLANS.map((p) => (
              <option key={p} value={p}>
                {TENANT_PLAN_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        {isDowngrading ? (
          <div className="border-warning/40 bg-warning/10 space-y-2.5 rounded-md border p-3">
            <p className="text-warning flex items-start gap-1.5 text-sm font-medium">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              This takes their site offline immediately.
            </p>
            <p className="text-text-muted text-sm">
              {tenant.canonical_host ?? `${tenant.slug}.${defaultDomain ?? "…"}`} will stop
              serving, and their subdomain is cleared. Their properties keep listing on the apex,
              and they keep their admin login — they just have no site of their own until
              switched back to Branded.
            </p>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                checked={downgradeConfirmed}
                onCheckedChange={(v) => {
                  setDowngradeConfirmed(v === true);
                  if (v === true) setDowngradeError(null);
                }}
                className="mt-0.5"
              />
              I understand, take their site offline
            </label>
            {downgradeError ? (
              <p role="alert" className="text-danger text-sm">
                {downgradeError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* A 'listing' tenant has no subdomain to configure — updateTenant()
            forces canonical_host to null for this plan regardless (belt and
            braces: see its own comment), so hiding the field here just keeps
            the form from showing a control that does nothing. */}
        {plan === "branded" ? (
          <div className="space-y-1.5">
            <Label htmlFor="edit_canonical_host">Custom subdomain (optional)</Label>
            <Input
              id="edit_canonical_host"
              name="canonical_host"
              defaultValue={tenant.canonical_host ?? ""}
              placeholder={defaultDomain ? `${tenant.slug}.${defaultDomain}` : "e.g. archana.deogharbnb.space"}
              className="h-11"
            />
            <p className="text-text-muted text-sm">
              Leave blank to use the default for their slug
              {defaultDomain ? ` (${tenant.slug}.${defaultDomain})` : ""}.
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="edit_status">Status</Label>
          <select
            id="edit_status"
            name="status"
            defaultValue={tenant.status}
            className="border-border h-11 w-full rounded-md border bg-transparent px-3"
          >
            {TENANT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <SaveBar pending={action.pending} saved={action.saved} error={action.error} />
      </form>
    </ResponsiveModal>
  );
}
