-- Diagnostic only — safe to run any time, changes nothing.
--
-- 1. Confirms the job exists and shows exactly what URL it's configured to
--    call. If this doesn't say https://kailasha-stays.vercel.app/api/cron/...
--    exactly, that's the whole bug right there.
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'sync-calendars-every-30-min';

-- 2. Recent run history — shows whether it's been firing at all, and if so,
--    whether pg_net's own request succeeded or failed (a DNS/connect error
--    here means the URL is wrong; a non-200 status_code means it reached
--    your app but got rejected, most likely a CRON_SECRET mismatch).
select start_time, status, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'sync-calendars-every-30-min')
order by start_time desc
limit 10;
