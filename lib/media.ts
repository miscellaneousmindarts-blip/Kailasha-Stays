/**
 * One definition of what counts as an uploadable image or video, shared by
 * the property-photo and homepage-media upload paths so the two can't drift.
 *
 * Whether a stored file is a video is decided by its extension rather than a
 * database column. That's reliable here because nothing else writes these
 * paths: every upload goes through `mediaExtension()` below, which maps a
 * validated MIME type to a known extension. It also keeps the homepage
 * library's `/public/...` seed paths working without a backfill.
 */

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * MP4 and WebM only, deliberately. iPhones record .mov (`video/quicktime`),
 * which Chrome and Firefox refuse to play in a <video> tag — accepting it
 * would look fine to whoever uploaded it on a Mac and be a black box for a
 * large share of visitors. Better to reject it with a message that says so.
 */
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** For an <input type="file"> accept attribute. */
export const MEDIA_ACCEPT = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES].join(",");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const VIDEO_EXTENSIONS = ["mp4", "webm"];

/** True for a stored path that holds a video rather than a photo. */
export function isVideoPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const ext = path.split("?")[0].split(".").pop()?.toLowerCase();
  return ext ? VIDEO_EXTENSIONS.includes(ext) : false;
}

export function mediaExtension(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? "bin";
}

/**
 * The still that represents a listing — grid thumbnails, card leads and the
 * OpenGraph tag. Videos are skipped rather than merely deprioritised: a
 * social preview or an <img> thumbnail can't render one at all, so falling
 * back to a later photo beats an empty frame.
 */
export function pickCover<T extends { storage_path: string; is_cover?: boolean }>(
  images: readonly T[],
): T | undefined {
  const stills = images.filter((i) => !isVideoPath(i.storage_path));
  return stills.find((i) => i.is_cover) ?? stills[0];
}

export type MediaCheck =
  | { error: string; ext?: undefined; isVideo?: undefined }
  | { error?: undefined; ext: string; isVideo: boolean };

/**
 * Validates an uploaded file's type and size in one place. Videos get a
 * larger budget than photos because even a short, well-compressed 1080p clip
 * runs past what a photo should ever need.
 */
export function checkMediaFile(file: File): MediaCheck {
  const isImage = (IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
  const isVideo = (VIDEO_MIME_TYPES as readonly string[]).includes(file.type);

  if (!isImage && !isVideo) {
    return {
      error: "Photos must be JPEG, PNG, WebP or AVIF, and videos MP4 or WebM.",
    };
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return { error: "Photos must be under 10MB." };
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { error: "Videos must be under 50MB." };
  }

  return { ext: mediaExtension(file.type), isVideo };
}
