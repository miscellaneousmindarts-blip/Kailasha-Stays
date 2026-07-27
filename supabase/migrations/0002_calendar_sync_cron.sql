-- =============================================================================
-- Phase 5 — scheduled calendar sync
--
-- Runs the app's /api/cron/sync-calendars route every 30 minutes via
-- pg_cron + pg_net. That route (not this database) does the actual work —
-- it fetches every calendar_sources row's iCal URL, parses it, and upserts
-- external_events. This SQL just tells Postgres to hit that URL on a timer.
--
-- BEFORE RUNNING: replace the two placeholders below —
--   1. https://YOUR-DEPLOYED-DOMAIN with your real Vercel URL (or a stable
--      custom domain) once the site is deployed. This will NOT work against
--      localhost, since Postgres runs on Supabase's infrastructure, not
--      your machine.
--   2. YOUR_CRON_SECRET with the exact value of the CRON_SECRET environment
--      variable set on your Vercel deployment (see .env.local.example).
-- If you ever rotate CRON_SECRET, re-run the cron.schedule block below with
-- the new value — cron.schedule with the same job name replaces the job.
-- =============================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'sync-calendars-every-30-min',
  '*/30 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR-DEPLOYED-DOMAIN/api/cron/sync-calendars',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 45000
  );
  $$
);

-- To check the job is registered:
--   select * from cron.job;
-- To see recent run history:
--   select * from cron.job_run_details order by start_time desc limit 10;
-- To remove the schedule entirely:
--   select cron.unschedule('sync-calendars-every-30-min');
