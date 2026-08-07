"use client";

import { AlertTriangle } from "lucide-react";

import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import { updateTenant } from "@/app/superadmin/actions";
import { TENANT_STATUSES, type TenantRow } from "@/lib/superadmin/types";
import { publicEnv } from "@/lib/env";

export function EditTenantModal({
  tenant,
  onClose,
}: {
  tenant: TenantRow;
  onClose: () => void;
}) {
  const action = useSaveAction(updateTenant);
  const defaultDomain = publicEnv.platformDomains[0];

  return (
    <ResponsiveModal open onClose={onClose} title={tenant.name}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
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
