-- ============================================================================
-- Stickiness pack #2: WEEKLY LEAGUES (the retention centerpiece).
--
-- Every player sits in a tier (1 Bronze → 6 Master). Each week ("season") they
-- earn League Points (LP) from competitive matches. A 30-strong pod (you + 29
-- deterministic rival bots for your tier/week) ranks by LP. At week's end:
--   • top 7   → promoted (tier + 1)
--   • bottom 7→ relegated (tier - 1)   (Bronze never relegates, Master never promotes)
-- Settlement is LAZY: it happens on the first read/match of a new week, so no
-- cron is required. The promotion/relegation outcome is stashed on the profile
-- and surfaced once to the UI.
--
-- LP is a vanity ladder (not coins), so it's added via a client-callable RPC —
-- same trust model as XP. Bot LP spread needs playtest tuning (see ranges below).
-- ============================================================================

alter table public.profiles add column if not exists league_tier       int not null default 1;
alter table public.profiles add column if not exists league_points     int not null default 0;
alter table public.profiles add column if not exists league_week       int;          -- week index the points belong to
alter table public.profiles add column if not exists best_league_tier  int not null default 1;
alter table public.profiles add column if not exists league_last_result jsonb;       -- pending season result to show once

-- Week index: integer count of 7-day blocks since a fixed anchor.
create or replace function public.league_week_now()
returns int language sql stable as $$
  select floor((current_date - date '2024-01-01') / 7)::int;
$$;

-- Deterministic rival-bot LP for a given (week, tier, slot). bigint cast avoids
-- abs(int_min) overflow. Higher tiers → stronger rivals (wider/higher spread).
create or replace function public.league_bot_lp(p_week int, p_tier int, p_slot int)
returns int language sql immutable as $$
  select (abs(hashtext(p_week || ':' || p_tier || ':' || p_slot)::bigint) % (400 + p_tier * 200))::int;
$$;

-- Settle any finished week(s) lazily, then ensure the profile is on the current week.
create or replace function public._league_sync(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_week int := public.league_week_now();
  v_tier int; v_lp int; v_pw int;
  v_rank int; v_pod int := 30; v_cut int := 7; v_newtier int; v_outcome text;
begin
  select league_tier, league_points, league_week into v_tier, v_lp, v_pw
    from public.profiles where id = p_uid for update;

  if v_pw is null then
    update public.profiles set league_week = v_week where id = p_uid;
    return;
  end if;
  if v_pw = v_week then return; end if;

  -- A new week started: settle the last played week (rank vs that week's bots).
  select 1 + count(*) into v_rank
  from generate_series(1, v_pod - 1) g
  where public.league_bot_lp(v_pw, v_tier, g) > v_lp;

  v_newtier := v_tier; v_outcome := 'stayed';
  if v_rank <= v_cut and v_tier < 6 then
    v_newtier := v_tier + 1; v_outcome := 'promoted';
  elsif v_rank > (v_pod - v_cut) and v_tier > 1 then
    v_newtier := v_tier - 1; v_outcome := 'relegated';
  end if;

  update public.profiles
     set league_tier = v_newtier,
         best_league_tier = greatest(best_league_tier, v_newtier),
         league_points = 0,
         league_week = v_week,
         league_last_result = jsonb_build_object(
           'outcome', v_outcome, 'from_tier', v_tier, 'to_tier', v_newtier,
           'rank', v_rank, 'points', v_lp)
   where id = p_uid;
end; $$;

-- Add LP from a competitive match (Arena / vs Computer). Clamped; only positive.
create or replace function public.add_league_points(p_points int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_gain int := greatest(0, least(1000, coalesce(p_points, 0))); v_lp int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._league_sync(v_uid);
  update public.profiles set league_points = league_points + v_gain where id = v_uid returning league_points into v_lp;
  return jsonb_build_object('points', v_lp, 'gain', v_gain);
end; $$;
revoke all on function public.add_league_points(int) from public;
grant execute on function public.add_league_points(int) to authenticated;

-- The league screen: your tier, the weekly pod leaderboard, your rank, the
-- promote/relegate zones, when the week ends, and any pending season result.
create or replace function public.get_league()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_week int := public.league_week_now();
  v_week_ends date := date '2024-01-01' + ((v_week + 1) * 7);
  v_tier int; v_lp int; v_result jsonb; v_board jsonb; v_rank int; v_pod int := 30;
  v_names text[] := array['Aarav','Diya','Kabir','Ananya','Vihaan','Sara','Ishaan','Myra','Reyansh','Tara','Arjun','Zoya','Leo','Mia','Omar','Nina','Ravi','Lena','Sam','Noor','Kai','Ada','Finn','Isla','Yash','Ria','Theo','Maya','Eva','Rohan'];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public._league_sync(v_uid);
  select league_tier, league_points, league_last_result into v_tier, v_lp, v_result
    from public.profiles where id = v_uid;
  if v_result is not null then update public.profiles set league_last_result = null where id = v_uid; end if;

  with bots as (
    select v_names[1 + (abs(hashtext(v_week || ':' || v_tier || ':n' || g)::bigint) % array_length(v_names, 1))] as name,
           public.league_bot_lp(v_week, v_tier, g) as lp, false as you
    from generate_series(1, v_pod - 1) g
  ),
  allp as (select name, lp, you from bots union all select 'You', v_lp, true),
  ranked as (select name, lp, you, row_number() over (order by lp desc, you desc) as rk from allp)
  select (select rk from ranked where you),
         (select jsonb_agg(jsonb_build_object('rank', rk, 'name', name, 'lp', lp, 'you', you) order by rk) from ranked)
  into v_rank, v_board;

  return jsonb_build_object(
    'tier', v_tier, 'points', v_lp, 'rank', v_rank, 'pod', v_pod,
    'promote_cut', 7, 'relegate_cut', 7, 'week_ends', v_week_ends,
    'board', v_board, 'season_result', v_result);
end; $$;
revoke all on function public.get_league() from public;
grant execute on function public.get_league() to authenticated;

-- profile snapshot now carries league tier/points too (for first paint).
create or replace function public.ensure_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_p public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.profiles (id, username, coins)
  values (v_uid, 'Player' || substr(v_uid::text, 1, 4), 1000)
  on conflict (id) do nothing;
  select * into v_p from public.profiles where id = v_uid;
  return jsonb_build_object(
    'id', v_p.id, 'username', v_p.username, 'coins', v_p.coins,
    'xp', coalesce(v_p.xp, 0),
    'win_streak', coalesce(v_p.win_streak, 0),
    'best_win_streak', coalesce(v_p.best_win_streak, 0),
    'league_tier', coalesce(v_p.league_tier, 1),
    'league_points', coalesce(v_p.league_points, 0),
    'daily_streak', coalesce(v_p.daily_streak, 0),
    'daily_available', (v_p.last_daily is distinct from current_date));
end;
$$;
