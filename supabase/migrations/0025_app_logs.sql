-- ============================================================================
-- 0025_app_logs.sql: Crash telemetry & in-app account deletion
--
-- 1. app_logs: Collects runtime exceptions from ErrorBoundary and logger.ts.
-- 2. delete_user_account: Apple Guideline 5.1.1(v) & Google Play mandatory in-app
--    permanent account deletion function.
-- ============================================================================

-- 1. Error & crash telemetry
create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  level text not null default 'error' check (level in ('error', 'warn', 'info')),
  message text not null,
  stack text,
  extra jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_logs_created_at on public.app_logs (created_at desc);
create index if not exists idx_app_logs_level on public.app_logs (level);

alter table public.app_logs enable row level security;

-- Allow clients to submit error reports
create policy app_logs_insert on public.app_logs
  for insert with check (true);

-- Protect logs: only service_role can read error telemetry
create policy app_logs_select_admin on public.app_logs
  for select using (auth.role() = 'service_role');

grant insert on public.app_logs to anon, authenticated;
grant all on public.app_logs to service_role;

-- 2. Mandatory Apple/Google in-app account deletion
create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Delete all player data
  delete from public.profiles where id = v_uid;
  delete from public.matches where user_id = v_uid;
  delete from public.level_progress where user_id = v_uid;
  delete from public.purchases where user_id = v_uid;
  delete from public.question_reports where user_id = v_uid;
  delete from public.room_players where user_id = v_uid;
  delete from public.app_logs where user_id = v_uid;

  -- Delete auth user
  delete from auth.users where id = v_uid;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated, anon;
