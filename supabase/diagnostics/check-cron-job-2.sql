-- Diagnostic only — safe to run, changes nothing.

-- 1. The job's exact configured command — the URL and secret are baked into
--    this SQL text at the time cron.schedule() was run. If the domain here
--    isn't exactly https://kailasha-stays.vercel.app, or the secret isn't
--    your current CRON_SECRET, that's the bug.
select command
from cron.job
where jobname = 'sync-calendars-every-30-min';

-- 2. The ACTUAL HTTP response Vercel sent back for each of those "succeeded"
--    runs — this is what query 2 last time couldn't show you. "succeeded" in
--    cron.job_run_details only means Postgres managed to hand the request to
--    pg_net; it says nothing about what came back. A status_code of 401 means
--    the secret is wrong; a connection/timeout error means the URL is wrong.
select
  r.created,
  r.status_code,
  left(r.content::text, 200) as body_preview
from net._http_response r
order by r.created desc
limit 10;
