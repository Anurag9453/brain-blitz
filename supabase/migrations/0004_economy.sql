-- ============================================================================
-- Economy v2: staking model + daily login bonus
--   • Each match ranks you in a ~50-player field (you + 49 bots for now).
--   • Top 10 win 10× entry · ranks 11–25 break even · 26+ lose entry.
--   • New entry-fee ladder.
--   • Daily login bonus that grows with a streak.
-- ============================================================================

-- ---- new fee ladder -------------------------------------------------------
update public.levels set fee = 50     where n = 1;
update public.levels set fee = 5000   where n = 2;
update public.levels set fee = 10000  where n = 3;
update public.levels set fee = 50000  where n = 4;
update public.levels set fee = 100000 where n = 5;
update public.levels set fee = 200000 where n = 6;

-- ---- daily-bonus columns on profiles --------------------------------------
alter table public.profiles add column if not exists last_daily   date;
alter table public.profiles add column if not exists daily_streak int not null default 0;

-- ---- ensure_profile now also reports daily availability -------------------
drop function if exists public.ensure_profile();
create or replace function public.ensure_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_p   public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.profiles (id, username, coins)
  values (v_uid, 'Player' || substr(v_uid::text, 1, 4), 500)
  on conflict (id) do nothing;
  select * into v_p from public.profiles where id = v_uid;
  return jsonb_build_object(
    'id', v_p.id,
    'username', v_p.username,
    'coins', v_p.coins,
    'daily_streak', coalesce(v_p.daily_streak, 0),
    'daily_available', (v_p.last_daily is distinct from current_date)
  );
end;
$$;
revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- ---- claim_daily_bonus ----------------------------------------------------
create or replace function public.claim_daily_bonus()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_last   date;
  v_streak int;
  v_today  date := current_date;
  v_amount int;
  v_coins  int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select last_daily, daily_streak into v_last, v_streak
    from public.profiles where id = v_uid for update;

  if v_last = v_today then
    return jsonb_build_object('claimed', false, 'reason', 'ALREADY_CLAIMED');
  end if;

  -- consecutive day keeps the streak, otherwise it resets
  if v_last = v_today - 1 then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 1; end if;

  -- 100 on day 1, +50 per consecutive day, capped at day 7 (=400)
  v_amount := 100 + (least(v_streak, 7) - 1) * 50;

  update public.profiles
     set coins = coins + v_amount, last_daily = v_today, daily_streak = v_streak
   where id = v_uid
   returning coins into v_coins;

  return jsonb_build_object('claimed', true, 'amount', v_amount, 'streak', v_streak, 'coins', v_coins);
end;
$$;
revoke all on function public.claim_daily_bonus() from public;
grant execute on function public.claim_daily_bonus() to authenticated;

-- ---- finish_match: 50-player field + staking payout -----------------------
create or replace function public.finish_match(
  p_match_id  uuid,
  p_correct   int,
  p_wrong     int,
  p_attempted int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_match  public.matches%rowtype;
  v_level  public.levels%rowtype;
  v_score  int;
  v_stars  int;
  v_rank   int;
  v_total  int;
  v_prize  int := 0;
  v_cap    int;
  v_coins  int;
  v_board  jsonb;
  v_names  text[] := array['Aarav','Diya','Kabir','Ananya','Vihaan','Sara','Ishaan','Myra','Reyansh','Tara','Arjun','Zoya','Leo','Mia','Omar','Nina','Ravi','Lena','Sam','Noor','Kai','Ada','Finn','Isla','Yash','Ria','Theo','Maya'];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;

  select * into v_level from public.levels where n = v_match.level;

  v_cap := floor(v_level.time_seconds / 1.2);
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then
    raise exception 'INVALID_RESULT';
  end if;

  v_score := p_correct * 3 - p_wrong;
  v_stars := case
    when v_score >= v_level.star3 then 3
    when v_score >= v_level.star2 then 2
    when v_score >= v_level.star1 then 1
    else 0 end;

  -- Rank the player in a 50-strong field (player + 49 bots).
  with bots as (
    select v_names[1 + floor(random() * array_length(v_names, 1))::int] as name,
           (v_level.bot_min + floor(random() * (v_level.bot_max - v_level.bot_min + 1)))::int as score,
           false as you
    from generate_series(1, 49)
  ),
  allp as (
    select name, score, you from bots
    union all
    select 'You', v_score, true
  ),
  ranked as (
    select name, score, you, row_number() over (order by score desc, you desc) as rk from allp
  )
  select
    (select rk from ranked where you),
    (select count(*)::int from ranked),
    (select jsonb_agg(jsonb_build_object('rank', rk, 'name', name, 'score', score, 'you', you) order by rk)
       from ranked where rk <= 10)
  into v_rank, v_total, v_board;

  -- If the player is outside the top 10, append their own row to the board.
  if v_rank > 10 then
    v_board := v_board || jsonb_build_object('rank', v_rank, 'name', 'You', 'score', v_score, 'you', true);
  end if;

  -- Staking payout
  if v_rank <= 10 then v_prize := v_level.fee * 10;     -- win 10×
  elsif v_rank <= 25 then v_prize := v_level.fee;       -- refund (break even)
  else v_prize := 0; end if;                            -- lose entry

  update public.profiles set coins = coins + v_prize
   where id = v_uid returning coins into v_coins;

  update public.matches
     set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong,
         attempted = p_attempted, rank = v_rank, prize = v_prize, stars = v_stars
   where id = p_match_id;

  insert into public.level_progress (user_id, level, best_stars, best_score)
  values (v_uid, v_match.level, v_stars, v_score)
  on conflict (user_id, level) do update
    set best_stars = greatest(public.level_progress.best_stars, excluded.best_stars),
        best_score = greatest(public.level_progress.best_score, excluded.best_score);

  return jsonb_build_object(
    'score', v_score, 'stars', v_stars, 'rank', v_rank, 'total', v_total,
    'prize', v_prize, 'coins', v_coins, 'unlocked_next', v_stars >= 1, 'board', v_board);
end;
$$;
