-- ============================================================================
-- Monetization #1: SEASON PASS (battle-pass). The highest-ROI lever — rides the
-- league loop, converts kids (cosmetics + FOMO) and parents (clear value bundle).
--
-- A season = 28 days. Players earn Pass Points (PP) from every match (= correct
-- answers). Tier = floor(PP / 100), capped at 10. Two tracks:
--   • FREE  tier t → 100·t coins
--   • PREM  tier t → 250·t coins, except t3=Sunset skin, t6=Ocean skin, t10=Galaxy skin
-- Premium unlocked once per season (coins now = testable coin sink; real-money
-- IAP at launch). Season rollover is LAZY (no cron), like leagues.
-- Reward formulas MUST mirror app/src/lib/pass.ts.
-- ============================================================================

alter table public.profiles add column if not exists pass_season       int;
alter table public.profiles add column if not exists pass_points       int not null default 0;
alter table public.profiles add column if not exists pass_premium      boolean not null default false;
alter table public.profiles add column if not exists pass_free_claimed int[] not null default '{}';
alter table public.profiles add column if not exists pass_prem_claimed int[] not null default '{}';

create or replace function public.pass_season_now()
returns int language sql stable as $$
  select floor((current_date - date '2024-01-01') / 28)::int;
$$;

-- Reset pass state when a new season has started since last activity.
create or replace function public._pass_sync(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_season int := public.pass_season_now(); v_ps int;
begin
  select pass_season into v_ps from public.profiles where id = p_uid for update;
  if v_ps is null then update public.profiles set pass_season = v_season where id = p_uid; return; end if;
  if v_ps = v_season then return; end if;
  update public.profiles
     set pass_season = v_season, pass_points = 0, pass_premium = false,
         pass_free_claimed = '{}', pass_prem_claimed = '{}'
   where id = p_uid;
end; $$;

-- Earn PP from a match (client-called, like XP). Clamped.
create or replace function public.add_pass_points(p_points int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_gain int := greatest(0, least(500, coalesce(p_points, 0))); v_pts int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._pass_sync(v_uid);
  update public.profiles set pass_points = pass_points + v_gain where id = v_uid returning pass_points into v_pts;
  return jsonb_build_object('points', v_pts, 'tier', least(10, floor(v_pts / 100)), 'season', public.pass_season_now());
end; $$;
revoke all on function public.add_pass_points(int) from public;
grant execute on function public.add_pass_points(int) to authenticated;

create or replace function public.get_season_pass()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_season int := public.pass_season_now();
  v_ends date := date '2024-01-01' + ((v_season + 1) * 28);
  v_pts int; v_prem boolean; v_fc int[]; v_pc int[];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._pass_sync(v_uid);
  select pass_points, pass_premium, pass_free_claimed, pass_prem_claimed
    into v_pts, v_prem, v_fc, v_pc from public.profiles where id = v_uid;
  return jsonb_build_object(
    'season', v_season, 'points', coalesce(v_pts, 0), 'tier', least(10, floor(coalesce(v_pts, 0) / 100)),
    'premium', coalesce(v_prem, false), 'pp_per_tier', 100, 'tiers', 10, 'price', 15000,
    'season_ends', v_ends, 'free_claimed', coalesce(v_fc, '{}'), 'prem_claimed', coalesce(v_pc, '{}'));
end; $$;
revoke all on function public.get_season_pass() from public;
grant execute on function public.get_season_pass() to authenticated;

-- Unlock the premium track (coins now; real-money IAP at launch).
create or replace function public.buy_season_pass()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_coins int; v_prem boolean; v_price int := 15000;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._pass_sync(v_uid);
  select coins, pass_premium into v_coins, v_prem from public.profiles where id = v_uid for update;
  if coalesce(v_prem, false) then raise exception 'ALREADY_PREMIUM'; end if;
  if v_coins < v_price then raise exception 'INSUFFICIENT_COINS'; end if;
  update public.profiles set coins = coins - v_price, pass_premium = true where id = v_uid returning coins into v_coins;
  return jsonb_build_object('coins', v_coins, 'premium', true);
end; $$;
revoke all on function public.buy_season_pass() from public;
grant execute on function public.buy_season_pass() to authenticated;

-- Claim a single unlocked tier reward on a track.
create or replace function public.claim_pass_reward(p_tier int, p_premium boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_pts int; v_prem boolean; v_fc int[]; v_pc int[]; v_coins int; v_owned text[]; v_curtier int;
  v_rtype text; v_ramount int := 0; v_rskin text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._pass_sync(v_uid);
  if p_tier < 1 or p_tier > 10 then raise exception 'BAD_TIER'; end if;

  select pass_points, pass_premium, pass_free_claimed, pass_prem_claimed, coins, owned_skins
    into v_pts, v_prem, v_fc, v_pc, v_coins, v_owned from public.profiles where id = v_uid for update;
  v_curtier := least(10, floor(coalesce(v_pts, 0) / 100));
  if p_tier > v_curtier then raise exception 'LOCKED'; end if;

  if p_premium then
    if not coalesce(v_prem, false) then raise exception 'NO_PREMIUM'; end if;
    if p_tier = any(coalesce(v_pc, '{}')) then raise exception 'ALREADY_CLAIMED'; end if;
  else
    if p_tier = any(coalesce(v_fc, '{}')) then raise exception 'ALREADY_CLAIMED'; end if;
  end if;

  -- Reward formula (mirror of app/src/lib/pass.ts).
  if not p_premium then
    v_rtype := 'coins'; v_ramount := 100 * p_tier;
  elsif p_tier = 3 then v_rtype := 'skin'; v_rskin := 'sunset';
  elsif p_tier = 6 then v_rtype := 'skin'; v_rskin := 'ocean';
  elsif p_tier = 10 then v_rtype := 'skin'; v_rskin := 'galaxy';
  else v_rtype := 'coins'; v_ramount := 250 * p_tier;
  end if;

  if v_rtype = 'coins' then
    update public.profiles set coins = coins + v_ramount where id = v_uid returning coins into v_coins;
  elsif not (v_rskin = any(coalesce(v_owned, '{}'))) then
    update public.profiles set owned_skins = array_append(owned_skins, v_rskin) where id = v_uid returning owned_skins into v_owned;
  end if;

  if p_premium then
    update public.profiles set pass_prem_claimed = array_append(pass_prem_claimed, p_tier) where id = v_uid returning pass_prem_claimed into v_pc;
  else
    update public.profiles set pass_free_claimed = array_append(pass_free_claimed, p_tier) where id = v_uid returning pass_free_claimed into v_fc;
  end if;

  return jsonb_build_object('coins', v_coins, 'owned_skins', coalesce(v_owned, '{}'),
    'free_claimed', coalesce(v_fc, '{}'), 'prem_claimed', coalesce(v_pc, '{}'),
    'reward_type', v_rtype, 'reward_amount', v_ramount, 'reward_skin', v_rskin);
end; $$;
revoke all on function public.claim_pass_reward(int, boolean) from public;
grant execute on function public.claim_pass_reward(int, boolean) to authenticated;
