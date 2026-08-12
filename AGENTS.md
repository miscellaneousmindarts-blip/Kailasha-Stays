<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database migrations

Migrations are plain SQL in `supabase/migrations/`, run by hand in the Supabase
SQL editor. There is no CLI applying them, so the file existing does **not**
mean it has run.

**Check before assuming:**

```bash
npm run migrations:status
```

That diffs the files on disk against the `schema_migrations` table and names
anything pending. Exits non-zero when something is unapplied *or* when two
files share a leading number.

**Two rules, both learned the hard way** — on 2026-08-12 two files were both
numbered `0022`, one ran, the other was assumed to have run, and booking
creation broke in production with `Could not find the 'blocks_calendar'
column of 'bookings'`:

1. **Never reuse a number.** Take the next one after the highest on disk, even
   if a lower number looks free.
2. **End every migration by recording itself**, so the table stays honest:

   ```sql
   insert into public.schema_migrations (version) values ('0026_your_migration')
     on conflict (version) do nothing;
   ```

Write migrations to be safe to re-run (`if not exists`, `create or replace`,
`on conflict do nothing`) — the same file often gets run twice across
environments.
