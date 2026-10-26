-- ============================================================================
-- 0026_anonymize_purchases_on_delete.sql: Compliance & Tax-Retentive Deletion
--
-- Preserves financial audit trails (order_id, amount_inr, timestamp) required
-- under statutory accounting / GST rules by setting user_id = null instead of
-- deleting the purchase row, while irreversibly purging all player profile data,
-- matches, and auth credentials.
-- ============================================================================

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
