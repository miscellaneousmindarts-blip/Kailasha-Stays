-- =============================================================================
-- Admin-entered Airbnb (or any channel) rating + review count
--
-- The apex homepage's homes grid wants to show "Also on Airbnb · ★ 4.9 (32
-- reviews)" next to a property card. Pulling that number automatically isn't
-- viable: Airbnb's Terms of Service prohibit scraping, there is no public API
-- for listing reviews, and the listing pages are JS-rendered behind bot
-- detection — a server-side fetch would be unreliable even setting the ToS
-- aside, and anything built on it would break silently and take the card's
-- credibility with it.
--
-- These three columns are the honest version instead: the host types the
-- number in, same as they already type in the booking URL. Ten seconds,
-- can't break, and ratings_checked_at lets a stale figure be audited later.
--
-- Nullable throughout, default nothing — a channel with no rating entered
-- just doesn't show the line, exactly like a channel with no booking_url
-- today doesn't show a link.
--
-- Safe to re-run.
-- =============================================================================

alter table public.booking_channels
  add column if not exists rating             numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  add column if not exists review_count       integer      check (review_count is null or review_count >= 0),
  add column if not exists ratings_checked_at date;

comment on column public.booking_channels.rating is
  'Admin-entered, e.g. from the Airbnb listing. Not fetched automatically — see migration header.';
comment on column public.booking_channels.review_count is
  'Admin-entered review count paired with rating. Both null or both set.';
comment on column public.booking_channels.ratings_checked_at is
  'When the admin last confirmed rating/review_count against the live listing.';

insert into public.schema_migrations (version) values ('0026_channel_ratings')
  on conflict (version) do nothing;
