-- ============================================================================
-- 0026_anonymize_purchases_on_delete.sql: Compliance & Tax-Retentive Deletion
--
-- 1. Drops NOT NULL and modifies foreign key on purchases.user_id to ON DELETE SET NULL.
-- 2. Updates delete_user_account() so financial purchase rows are anonymized
--    (user_id set to NULL) instead of deleted, complying with tax/statutory audit
--    record-retention rules while permanently wiping player data.
-- ============================================================================

-- 1. Relax NOT NULL constraint on purchases.user_id
alter table if exists public.purchases 
  alter column user_id drop not null;

-- 2. Modify foreign key constraint to ON DELETE SET NULL
alter table if exists public.purchases 
  drop constraint if exists purchases_user_id_fkey;

alter table if exists public.purchases
  add constraint purchases_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete set null;

-- 3. Replace delete_user_account() RPC
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

  -- 1. Anonymize financial purchase logs (severing personal user link)
  update public.purchases set user_id = null where user_id = v_uid;

  -- 2. Delete all player game data
  delete from public.profiles where id = v_uid;
  delete from public.matches where user_id = v_uid;
  delete from public.level_progress where user_id = v_uid;
  delete from public.question_reports where user_id = v_uid;
  delete from public.room_players where user_id = v_uid;
  delete from public.app_logs where user_id = v_uid;

  -- 3. Delete auth account
  delete from auth.users where id = v_uid;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated, anon;
