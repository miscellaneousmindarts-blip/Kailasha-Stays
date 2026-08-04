-- =============================================================================
-- Video uploads for listing media and the homepage library
--
-- Both buckets rejected anything that wasn't a still image at the storage
-- layer, so the app-side checks were never the only gate. This widens them to
-- MP4 and WebM and raises the size ceiling to 50MB, which a short 1080p clip
-- needs and a photo never will.
--
-- The per-file limits stay stricter in app code (lib/media.ts): photos are
-- still capped at 10MB, and only videos get the larger budget. The bucket
-- limit has to be the higher of the two because it applies to the whole
-- bucket, so it is the outer bound, not the rule.
--
-- .mov (video/quicktime) is deliberately NOT allowed: Chrome and Firefox
-- won't play it in a <video> tag, so it would upload cleanly and then be a
-- black rectangle for a large share of visitors.
-- =============================================================================

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm'
    ]
where id in ('property-images', 'homepage-media');
