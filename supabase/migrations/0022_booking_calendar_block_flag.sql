-- =============================================================================
-- Separate "this booking exists" from "these dates are unavailable"
--
-- Until now the bookings_no_overlap exclusion constraint fired on ANY
-- confirmed/completed row, so it could not distinguish a real reservation
-- from a manual block, and had no way to represent a booking that is
-- deliberately NOT the thing holding the dates — e.g. recording an Airbnb
-- guest for portal/ID-upload purposes when Airbnb's own iCal sync already
-- blocks those dates here. Creating that record used to fail outright.
--
-- blocks_calendar is that distinction, made explicit rather than inferred
-- from `source`: true means "this row occupies the dates" (the exclusion
-- constraint and the iCal export both key off it), false means "this is a
-- record only — something else is already holding these dates."
--
-- Defaults to true, so every existing booking and every future insert that
-- doesn't think about this keeps today's behaviour exactly: a normal booking
-- blocks, same as before.
--
-- Safe to re-run.
-- =============================================================================

alter table public.bookings
  add column if not exists blocks_calendar boolean not null default true;

comment on column public.bookings.blocks_calendar is
  'True (default): this row occupies its dates — checked by bookings_no_overlap and '
  'exported to the iCal feed. False: a record only, e.g. an Airbnb guest logged here '
  'for portal/ID-upload purposes while Airbnb''s own sync already blocks the dates — '
  'setting this true too would double-block and, since our own export feeds back into '
  'Airbnb''s import, risk a feedback loop.';

-- The guarantee against double-booking now only applies to rows that are
-- actually claiming the dates. Reproduced verbatim from 0001_init.sql except
-- for the added `and blocks_calendar`.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('confirmed','completed') and blocks_calendar);

-- check_availability is not yet called anywhere in the app (grepped: only
-- referenced in generated types), but it exists to answer the same question
-- the constraint enforces, so it must not silently disagree with it now that
-- the constraint learned a new condition.
create or replace function public.check_availability(
  p_property_id uuid, p_check_in date, p_check_out date
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_check_out > p_check_in
     and not exists (
       select 1 from public.bookings b
        where b.property_id = p_property_id
          and b.status in ('confirmed','completed')
          and b.blocks_calendar
          and daterange(b.check_in, b.check_out, '[)')
              && daterange(p_check_in, p_check_out, '[)')
     )
     and not exists (
       select 1 from public.external_events e
        where e.property_id = p_property_id
          and daterange(e.start_date, e.end_date, '[)')
              && daterange(p_check_in, p_check_out, '[)')
     );
$$;

revoke execute on function public.check_availability(uuid, date, date) from public;
grant execute on function public.check_availability(uuid, date, date) to anon, authenticated;
