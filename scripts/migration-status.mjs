#!/usr/bin/env node
/**
 * Diffs supabase/migrations/*.sql against the schema_migrations table and
 * names anything pending.
 *
 * This exists because of a real outage: on 2026-08-12 two migrations were
 * both numbered 0022, one was run, the other was assumed run, and booking
 * creation broke in production with "Could not find the 'blocks_calendar'
 * column of 'bookings'". Nothing in the project could answer "has this
 * actually been applied?" — so nothing caught it. Now something can.
 *
 *   npm run migrations:status
 *
 * Exits 1 when a migration on disk has no row, so it can gate a deploy.
 * Uses SUPABASE_SERVICE_ROLE_KEY (RLS is on and there is no read policy).
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    return Object.fromEntries(
      readFileSync(join(root, ".env.local"), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local or environment).",
  );
  process.exit(2);
}

const onDisk = readdirSync(join(root, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .map((f) => f.replace(/\.sql$/, ""))
  .sort();

// A duplicate leading number is the exact shape of the bug this script was
// written for, so it is reported even when every migration has been applied.
const byNumber = new Map();
for (const v of onDisk) {
  const n = v.slice(0, 4);
  byNumber.set(n, [...(byNumber.get(n) ?? []), v]);
}
const collisions = [...byNumber.entries()].filter(([, v]) => v.length > 1);

const res = await fetch(`${url}/rest/v1/schema_migrations?select=version`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (res.status === 404 || res.status === 406) {
  console.error(
    "schema_migrations table not found — run supabase/migrations/0025_schema_migrations.sql first.",
  );
  process.exit(1);
}
if (!res.ok) {
  console.error(`Could not read schema_migrations: ${res.status} ${await res.text()}`);
  process.exit(2);
}

const applied = new Set((await res.json()).map((r) => r.version));
const pending = onDisk.filter((v) => !applied.has(v));
const unknown = [...applied].filter((v) => !onDisk.includes(v)).sort();

for (const v of onDisk) {
  console.log(`${applied.has(v) ? "  applied " : "> PENDING"}  ${v}`);
}

if (unknown.length) {
  console.log(`\nRecorded but not on disk (renamed or deleted): ${unknown.join(", ")}`);
}

if (collisions.length) {
  console.log("\nDuplicate migration numbers — renumber so the order is unambiguous:");
  for (const [n, versions] of collisions) console.log(`  ${n}: ${versions.join(", ")}`);
}

if (pending.length) {
  console.log(`\n${pending.length} migration(s) pending. Run in the Supabase SQL editor, in order:`);
  for (const v of pending) console.log(`  supabase/migrations/${v}.sql`);
  process.exit(1);
}

console.log(
  `\nUp to date — ${onDisk.length} migration(s) applied${collisions.length ? ", but see the duplicate numbers above" : ""}.`,
);
process.exit(collisions.length ? 1 : 0);
