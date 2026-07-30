"use client";

import { createContext, useCallback, useContext, useState } from "react";

import {
  deleteHomepageImage,
  updateHomepageImageMeta,
  uploadHomepageImage,
} from "@/app/admin/(dashboard)/homepage/media-actions";
import type { HomepageImage } from "@/lib/types/database";

/**
 * The shared media library, lifted above the whole builder tree.
 *
 * Every image field on every section — twelve builtins plus five custom
 * layouts, several of them nested inside repeatable lists — opens a picker
 * onto the SAME pool. Threading `pool` and an upload handler through that
 * many prop layers would make every editor's signature about plumbing
 * instead of its own fields, so this is a context instead: any picker calls
 * useMediaLibrary() and gets the current pool plus mutations that update it
 * in place, so a photo uploaded from inside a deeply nested tile picker shows
 * up immediately in every other picker on the page too.
 */
type MediaLibraryContextValue = {
  pool: HomepageImage[];
  upload: (file: File, title: string, alt: string) => Promise<{ error?: string; image?: HomepageImage }>;
  updateMeta: (id: string, title: string, alt: string) => Promise<{ error?: string }>;
  remove: (image: HomepageImage) => Promise<{ error?: string }>;
};

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(null);

export function MediaLibraryProvider({
  initialPool,
  children,
}: {
  initialPool: HomepageImage[];
  children: React.ReactNode;
}) {
  const [pool, setPool] = useState(initialPool);

  const upload = useCallback(async (file: File, title: string, alt: string) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", title);
    formData.set("alt", alt);
    const result = await uploadHomepageImage(formData);
    if (result.error || !result.image) return { error: result.error ?? "Upload failed." };

    setPool((prev) => [result.image!, ...prev]);
    return { image: result.image };
  }, []);

  const updateMeta = useCallback(async (id: string, title: string, alt: string) => {
    const result = await updateHomepageImageMeta(id, title, alt);
    if (result.error) return { error: result.error };
    setPool((prev) =>
      prev.map((img) => (img.id === id ? { ...img, title: title || null, alt: alt || null } : img)),
    );
    return {};
  }, []);

  const remove = useCallback(async (image: HomepageImage) => {
    const result = await deleteHomepageImage(image.id, image.storage_path);
    if (result.error) return { error: result.error };
    setPool((prev) => prev.filter((img) => img.id !== image.id));
    return {};
  }, []);

  return (
    <MediaLibraryContext.Provider value={{ pool, upload, updateMeta, remove }}>
      {children}
    </MediaLibraryContext.Provider>
  );
}

export function useMediaLibrary(): MediaLibraryContextValue {
  const ctx = useContext(MediaLibraryContext);
  if (!ctx) throw new Error("useMediaLibrary() must be used inside <MediaLibraryProvider>.");
  return ctx;
}
