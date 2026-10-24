-- ============================================================================
-- Stickiness pack #1: account XP/level + win streaks with prize multipliers.
--
--  • profiles.xp              — lifetime XP (drives a vanity account level)
--  • profiles.win_streak      — current consecutive competitive wins
--  • profiles.best_win_streak — personal record
--
-- XP is earned every match (correct × 10, +50 for a competitive win).
-- A win streak builds on Arena (top-10 finish) and vs-Computer (a win); any
-- non-win resets it. The streak scales the *prize* with a bonus on top:
--    streak 3–4 → +50%,  5–6 → +100%,  7+ → +200%.
-- ============================================================================

alter table public.profiles add column if not exists xp              int not null default 0;
alter table public.profiles add column if not exists win_streak      int not null default 0;
alter table public.profiles add column if not exists best_win_streak int not null default 0;

-- ---- profile snapshot now includes xp + streak ----
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
    'daily_streak', coalesce(v_p.daily_streak, 0),
    'daily_available', (v_p.last_daily is distinct from current_date));
end;
$$;

-- ---- streak → prize multiplier helper ----
create or replace function public.streak_multiplier(p_streak int)
returns numeric language sql immutable as $$
  select case when p_streak >= 7 then 3.0 when p_streak >= 5 then 2.0 when p_streak >= 3 then 1.5 else 1.0 end;
$$;

-- ---- Arena: XP + win streak (top-10 = win) ----
create or replace function public.finish_match(
  p_match_id uuid, p_correct int, p_wrong int, p_attempted int
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_level public.levels%rowtype;
  v_score int; v_stars int; v_rank int := 1; v_total int; v_prize int := 0; v_cap int; v_coins int;
  v_win boolean; v_streak int; v_mult numeric; v_bonus int := 0; v_xp_gain int; v_xp int;
  v_names text[] := array['Aarav','Diya','Kabir','Ananya','Vihaan','Sara','Ishaan','Myra','Reyansh','Tara','Arjun','Zoya','Leo','Mia','Omar','Nina','Ravi','Lena','Sam','Noor','Kai','Ada','Finn','Isla','Yash','Ria','Theo','Maya'];
  v_board jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.matches where id = p_match_id and user_id = v_uid and status = 'pending' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  select * into v_level from public.levels where n = v_match.level;

  v_cap := v_level.time_seconds * 4;
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then raise exception 'INVALID_RESULT'; end if;

  v_score := p_correct * 3 - p_wrong;
  v_stars := case when v_score >= v_level.star3 then 3 when v_score >= v_level.star2 then 2 when v_score >= v_level.star1 then 1 else 0 end;

  with bots as (
    select v_names[1 + floor(random() * array_length(v_names, 1))::int] as name,
           (v_level.bot_min + floor(random() * (v_level.bot_max - v_level.bot_min + 1)))::int as score, false as you
    from generate_series(1, 49)
  ),
  allp as (select name, score, you from bots union all select 'You', v_score, true),
  ranked as (select name, score, you, row_number() over (order by score desc, you desc) as rk from allp)
  select (select rk from ranked where you), (select count(*)::int from ranked),
         (select jsonb_agg(jsonb_build_object('rank', rk, 'name', name, 'score', score, 'you', you) order by rk) from ranked where rk <= 10)
  into v_rank, v_total, v_board;
  if v_rank > 10 then v_board := v_board || jsonb_build_object('rank', v_rank, 'name', 'You', 'score', v_score, 'you', true); end if;

  if v_rank <= 10 then v_prize := v_level.fee * 2; elsif v_rank <= 25 then v_prize := v_level.fee; else v_prize := 0; end if;

  -- win streak (a top-10 finish is a "win") + prize multiplier
  v_win := (v_rank <= 10);
  select win_streak into v_streak from public.profiles where id = v_uid;
  if v_win then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 0; end if;
  v_mult := public.streak_multiplier(v_streak);
  if v_win then v_bonus := floor(v_prize * (v_mult - 1))::int; else v_bonus := 0; end if;

  v_xp_gain := p_correct * 10 + (case when v_win then 50 else 0 end);

  update public.profiles
     set coins = coins + v_prize + v_bonus,
         win_streak = v_streak,
         best_win_streak = greatest(coalesce(best_win_streak, 0), v_streak),
         xp = coalesce(xp, 0) + v_xp_gain
   where id = v_uid returning coins, xp into v_coins, v_xp;

  update public.matches set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong, attempted = p_attempted, rank = v_rank, prize = v_prize, stars = v_stars where id = p_match_id;
  insert into public.level_progress (user_id, level, best_stars, best_score) values (v_uid, v_match.level, v_stars, v_score)
  on conflict (user_id, level) do update set best_stars = greatest(public.level_progress.best_stars, excluded.best_stars), best_score = greatest(public.level_progress.best_score, excluded.best_score);

  return jsonb_build_object('score', v_score, 'stars', v_stars, 'rank', v_rank, 'total', v_total,
    'prize', v_prize, 'streak_bonus', v_bonus, 'multiplier', v_mult, 'win_streak', v_streak,
    'xp', v_xp, 'xp_gain', v_xp_gain, 'coins', v_coins, 'unlocked_next', v_stars >= 1, 'board', v_board);
end; $$;

-- ---- vs Computer: XP + win streak (outcome = win) ----
create or replace function public.finish_duel(p_match_id uuid, p_correct int, p_wrong int, p_attempted int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_match public.matches%rowtype; v_fee int; v_score int; v_bot int;
  v_outcome text; v_prize int := 0; v_coins int; v_cap int;
  v_win boolean; v_streak int; v_mult numeric; v_bonus int := 0; v_xp_gain int; v_xp int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.matches where id = p_match_id and user_id = v_uid and status = 'pending' and mode <> 'arena' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  select fee into v_fee from public.levels where n = v_match.level;
  v_cap := coalesce(v_match.duration_seconds, 120) * 4;
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then raise exception 'INVALID_RESULT'; end if;
  v_score := p_correct * 3 - p_wrong; v_bot := v_match.opponent_score;
  if v_score > v_bot then v_outcome := 'win'; v_prize := v_fee * 2; elsif v_score = v_bot then v_outcome := 'draw'; v_prize := v_fee; else v_outcome := 'lose'; v_prize := 0; end if;

  v_win := (v_outcome = 'win');
  select win_streak into v_streak from public.profiles where id = v_uid;
  if v_win then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 0; end if;
  v_mult := public.streak_multiplier(v_streak);
  if v_win then v_bonus := floor(v_prize * (v_mult - 1))::int; else v_bonus := 0; end if;

  v_xp_gain := p_correct * 10 + (case when v_win then 50 else 0 end);

  update public.profiles
     set coins = coins + v_prize + v_bonus,
         win_streak = v_streak,
         best_win_streak = greatest(coalesce(best_win_streak, 0), v_streak),
         xp = coalesce(xp, 0) + v_xp_gain
   where id = v_uid returning coins, xp into v_coins, v_xp;

  update public.matches set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong, attempted = p_attempted, prize = v_prize where id = p_match_id;

  return jsonb_build_object('player_score', v_score, 'opponent_score', v_bot, 'outcome', v_outcome,
    'prize', v_prize, 'streak_bonus', v_bonus, 'multiplier', v_mult, 'win_streak', v_streak,
    'xp', v_xp, 'xp_gain', v_xp_gain, 'coins', v_coins);
end; $$;

-- ---- Friends: award XP per finished player (no streak; winner settled later) ----
create or replace function public.submit_room_score(p_room_id uuid, p_correct int, p_wrong int, p_attempted int, p_forfeit boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_cap int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then raise exception 'NOT_IN_ROOM'; end if;
  select coalesce(duration_seconds, 120) * 4 into v_cap from public.rooms where id = p_room_id;
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > coalesce(v_cap, 480) then raise exception 'INVALID_RESULT'; end if;
  update public.room_players set score = p_correct * 3 - p_wrong, finished = true, forfeit = p_forfeit where room_id = p_room_id and user_id = v_uid;
  update public.profiles set xp = coalesce(xp, 0) + p_correct * 10 where id = v_uid;
  perform public.settle_room(p_room_id);
  return jsonb_build_object('ok', true);
end; $$;

-- ---- free modes (Marathon/Practice) award XP client-side via this RPC ----
create or replace function public.add_xp(p_amount int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_xp int; v_gain int := greatest(0, least(2000, coalesce(p_amount, 0)));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.profiles set xp = coalesce(xp, 0) + v_gain where id = v_uid returning xp into v_xp;
  return jsonb_build_object('xp', v_xp, 'xp_gain', v_gain);
end; $$;
revoke all on function public.add_xp(int) from public;
grant execute on function public.add_xp(int) to authenticated;
