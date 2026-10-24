-- ============================================================================
-- Rewarded-ad coin grant. Daily-capped so it can't be farmed. In Expo Go the
-- "Watch ad" button calls this directly (no real ad). At dev-build time, gate
-- the button behind a real rewarded ad (AdMob) — server stays the same.
-- (Real coin TOP-UPS / IAP are added at launch via RevenueCat — see ADS_IAP_SETUP.md.)
-- ============================================================================

alter table public.profiles add column if not exists ad_date  date;
alter table public.profiles add column if not exists ad_count int not null default 0;

create or replace function public.claim_ad_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_date   date;
  v_count  int;
  v_today  date := current_date;
  v_reward int := 50;   -- coins per ad
  v_cap    int := 5;    -- max ads/day
  v_coins  int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select ad_date, ad_count into v_date, v_count from public.profiles where id = v_uid for update;
  if v_date is distinct from v_today then v_count := 0; end if;
  if coalesce(v_count, 0) >= v_cap then
    return jsonb_build_object('ok', false, 'reason', 'LIMIT', 'remaining', 0);
  end if;

  v_count := coalesce(v_count, 0) + 1;
  update public.profiles set coins = coins + v_reward, ad_date = v_today, ad_count = v_count
   where id = v_uid returning coins into v_coins;

  return jsonb_build_object('ok', true, 'amount', v_reward, 'coins', v_coins, 'remaining', v_cap - v_count);
end;
$$;
revoke all on function public.claim_ad_reward() from public;
grant execute on function public.claim_ad_reward() to authenticated;
