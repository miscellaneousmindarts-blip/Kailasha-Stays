-- =============================================================================
-- Impersonation audit log (phase B6 of docs/saas-multi-tenant-plan.md)
--
-- Records every time a superadmin starts or stops acting as one of their
-- customers. The question this answers is "who had access to this tenant's
-- data, and when" — the one that actually matters if a customer ever asks,
-- or if something in their account changed and nobody remembers why.
--
-- SCOPE, stated honestly: this logs the SESSION, not each individual write
-- made during it. Per-mutation logging would mean threading a writer through
-- all ~40 server actions, and the marginal value over "X had access to tenant
-- Y between 14:02 and 14:19" is small until there are enough staff for that
-- distinction to matter. Revisit when there is more than one superadmin.
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.impersonation_log (
  id           uuid primary key default gen_random_uuid(),
  -- Deliberately NOT ON DELETE CASCADE from auth.users: the whole point of an
  -- audit record is that it outlives the account it describes. If the admin
  -- is ever deleted the row stays, with a dangling id that is still evidence.
  actor_id     uuid not null,
  actor_email  text,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  tenant_slug  text not null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create index if not exists impersonation_log_tenant_idx
  on public.impersonation_log (tenant_id, started_at desc);
create index if not exists impersonation_log_actor_idx
  on public.impersonation_log (actor_id, started_at desc);

alter table public.impersonation_log enable row level security;

-- Only superadmins read it, and nobody edits or deletes it through the app:
-- an audit trail an actor can rewrite isn't one. There is deliberately no
-- update or delete policy — INSERT and SELECT only.
drop policy if exists impersonation_log_superadmin_read on public.impersonation_log;
create policy impersonation_log_superadmin_read on public.impersonation_log
  for select to authenticated using (public.is_superadmin());

drop policy if exists impersonation_log_superadmin_insert on public.impersonation_log;
create policy impersonation_log_superadmin_insert on public.impersonation_log
  for insert to authenticated with check (public.is_superadmin() and actor_id = auth.uid());

-- Closing out a session is the one permitted update, and only on the actor's
-- own open row — so an ended_at can be stamped but a start can never be
-- rewritten or attributed to someone else.
drop policy if exists impersonation_log_close_own on public.impersonation_log;
create policy impersonation_log_close_own on public.impersonation_log
  for update to authenticated
  using (public.is_superadmin() and actor_id = auth.uid() and ended_at is null)
  with check (public.is_superadmin() and actor_id = auth.uid());
