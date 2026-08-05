"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveBar } from "@/components/admin/save-bar";
import { useSaveAction } from "@/components/admin/use-save-action";
import {
  removeBrandFavicon,
  removeBrandLogo,
  updateBrandDetails,
  uploadBrandFavicon,
  uploadBrandLogo,
} from "@/app/admin/(dashboard)/settings/brand-actions";
import { homepageImageUrl } from "@/lib/images";
import type { SiteSettings } from "@/lib/types/database";

const DEFAULT_BRAND_COLOR = "#c2410c";

/**
 * A single upload/remove slot for one brand asset (logo or favicon).
 * Uploads immediately on file choice rather than waiting for a form submit —
 * there's nothing else to fill in alongside it, so a separate save step
 * would just be an extra click with no decision behind it.
 */
function AssetSlot({
  label,
  hint,
  path,
  previewClassName,
  upload,
  remove,
}: {
  label: string;
  hint: string;
  path: string | null;
  previewClassName: string;
  upload: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  remove: () => Promise<{ error?: string; success?: boolean }>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAction = useSaveAction(upload);
  const removeAction = useSaveAction(remove);
  const src = homepageImageUrl(path);

  async function pick(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    await uploadAction.runAndWait(formData);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex items-start gap-4">
      <div
        className={`bg-surface-subtle border-border relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border ${previewClassName}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-contain p-2" />
        ) : (
          <span className="text-text-muted px-1 text-center text-[11px]">None set</span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium">{label}</p>
        <p className="text-text-muted text-sm">{hint}</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadAction.pending || removeAction.pending}
            className="border-border hover:bg-surface-subtle pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60"
          >
            {uploadAction.pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-3.5" aria-hidden="true" />
            )}
            {path ? "Replace" : "Upload"}
          </button>
          {path ? (
            <button
              type="button"
              onClick={() => removeAction.run()}
              disabled={uploadAction.pending || removeAction.pending}
              className="text-danger hover:bg-danger/10 pressable flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium disabled:opacity-60"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
        {uploadAction.error || removeAction.error ? (
          <p role="alert" className="text-danger text-sm">
            {uploadAction.error || removeAction.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BrandSettingsForm({ settings }: { settings: SiteSettings }) {
  const detailsAction = useSaveAction(updateBrandDetails);
  const [brandColor, setBrandColor] = useState(settings.brand_color ?? "");

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-5">
        <AssetSlot
          label="Logo"
          hint="Shown in the header in place of your business name as text. Any shape works — it's scaled to fit."
          path={settings.logo_path}
          previewClassName="h-14 w-32"
          upload={uploadBrandLogo}
          remove={removeBrandLogo}
        />
        <AssetSlot
          label="Favicon"
          hint="The small icon in a browser tab. Square works best."
          path={settings.favicon_path}
          previewClassName="size-14"
          upload={uploadBrandFavicon}
          remove={removeBrandFavicon}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          detailsAction.run(new FormData(e.currentTarget));
        }}
        className="border-border space-y-5 border-t pt-6"
      >
        <div className="space-y-2">
          <Label htmlFor="brand_color">Brand color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="brand_color_picker"
              value={brandColor || DEFAULT_BRAND_COLOR}
              onChange={(e) => setBrandColor(e.target.value)}
              className="border-border h-11 w-14 shrink-0 cursor-pointer rounded-md border p-1"
              aria-label="Pick a brand color"
            />
            <Input
              id="brand_color"
              name="brand_color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder={DEFAULT_BRAND_COLOR}
              className="h-11 max-w-40"
            />
            {brandColor ? (
              <button
                type="button"
                onClick={() => setBrandColor("")}
                className="text-text-muted hover:text-foreground pressable text-sm font-medium"
              >
                Reset to default
              </button>
            ) : null}
          </div>
          <p className="text-text-muted text-sm">
            Used for buttons, links and highlights across your site. Leave blank for the default terracotta.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="legal_name">Legal name</Label>
          <Input
            id="legal_name"
            name="legal_name"
            defaultValue={settings.legal_name ?? ""}
            placeholder="e.g. Kailasha Hospitality Pvt Ltd"
            className="h-11"
          />
          <p className="text-text-muted text-sm">
            Only shown in the footer&apos;s fine print, if it differs from your business name.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="footer_note">Footer note</Label>
          <Textarea
            id="footer_note"
            name="footer_note"
            rows={2}
            defaultValue={settings.footer_note ?? ""}
            placeholder="e.g. GSTIN 09XXXXX1234X1Z5"
          />
        </div>

        <SaveBar pending={detailsAction.pending} saved={detailsAction.saved} error={detailsAction.error} />
      </form>
    </div>
  );
}
