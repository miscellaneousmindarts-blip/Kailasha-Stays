"use client";

import { createContext, useCallback, useContext, useState } from "react";

import {
  deletePlatformImage,
  updatePlatformImageMeta,
  uploadPlatformImage,
} from "@/app/superadmin/homepage/media-actions";
import type { PlatformImage } from "@/lib/types/database";

/**
 * Same shape and purpose as components/admin/homepage/media-library-context.tsx
 * — a shared pool lifted above the builder tree so a photo uploaded from one
 * section's picker shows up immediately in every other picker on the page.
 * A separate copy, not a shared one: that file is hardwired to HomepageImage
 * (which carries tenant_id) and the tenant's own media-actions.ts, and this
 * is live production code not worth genericising for a second, much smaller
 * consumer — see docs/apex-homepage-editor-plan.md §5.
 */
type PlatformMediaLibraryContextValue = {
  pool: PlatformImage[];
  upload: (file: File, title: string, alt: string) => Promise<{ error?: string; image?: PlatformImage }>;
  updateMeta: (id: string, title: string, alt: string) => Promise<{ error?: string }>;
  remove: (image: PlatformImage) => Promise<{ error?: string }>;
};

const PlatformMediaLibraryContext = createContext<PlatformMediaLibraryContextValue | null>(null);

export function PlatformMediaLibraryProvider({
  initialPool,
  children,
}: {
  initialPool: PlatformImage[];
  children: React.ReactNode;
}) {
  const [pool, setPool] = useState(initialPool);

  const upload = useCallback(async (file: File, title: string, alt: string) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", title);
    formData.set("alt", alt);
    const result = await uploadPlatformImage(formData);
    if (result.error || !result.image) return { error: result.error ?? "Upload failed." };

    setPool((prev) => [result.image!, ...prev]);
    return { image: result.image };
  }, []);

  const updateMeta = useCallback(async (id: string, title: string, alt: string) => {
    const result = await updatePlatformImageMeta(id, title, alt);
    if (result.error) return { error: result.error };
    setPool((prev) =>
      prev.map((img) => (img.id === id ? { ...img, title: title || null, alt: alt || null } : img)),
    );
    return {};
  }, []);

  const remove = useCallback(async (image: PlatformImage) => {
    const result = await deletePlatformImage(image.id, image.storage_path);
    if (result.error) return { error: result.error };
    setPool((prev) => prev.filter((img) => img.id !== image.id));
    return {};
  }, []);

  return (
    <PlatformMediaLibraryContext.Provider value={{ pool, upload, updateMeta, remove }}>
      {children}
    </PlatformMediaLibraryContext.Provider>
  );
}

export function usePlatformMediaLibrary(): PlatformMediaLibraryContextValue {
  const ctx = useContext(PlatformMediaLibraryContext);
  if (!ctx) throw new Error("usePlatformMediaLibrary() must be used inside <PlatformMediaLibraryProvider>.");
  return ctx;
}
