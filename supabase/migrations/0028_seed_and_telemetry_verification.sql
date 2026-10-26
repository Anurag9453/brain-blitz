-- ============================================================================
-- 0028_seed_and_telemetry_verification.sql: Server-Issued Seed & Answer Telemetry
--
-- 1. Adds `seed` and `answer_log` to `public.matches` so every Arena and vs CPU
--    match uses a server-authoritative PRNG seed (preventing client seed picking)
--    and records per-question reaction times & choices for replay auditing.
-- 2. Adds `validate_answer_log` to verify per-question human reaction bounds,
--    timing variance (catching fixed-interval bot scripts), and counter parity.
-- ============================================================================

alter table public.matches
  add column if not exists seed int not null default (floor(random() * 2000000000) + 1)::int,
  add column if not exists answer_log jsonb;

-- 1. Helper: Validate per-question telemetry log
create or replace function public.validate_answer_log(
  p_log jsonb,
  p_correct int,
  p_wrong int,
  p_attempted int,
  p_duration_secs int
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_len int;
  v_ok_count int := 0;
  v_bad_count int := 0;
  v_min_ms int := 999999999;
  v_max_ms int := 0;
  v_sum_ms bigint := 0;
  v_item jsonb;
  v_ms int;
  v_chosen text;
  v_ok boolean;
begin
  if p_log is null then
    return;
  end if;

  if jsonb_typeof(p_log) <> 'array' then
    raise exception 'INVALID_ANSWER_LOG_FORMAT';
  end if;

  v_len := jsonb_array_length(p_log);
  if v_len < p_attempted then
    raise exception 'ANSWER_LOG_COUNT_MISMATCH';
  end if;

  for v_item in select * from jsonb_array_elements(p_log)
  loop
    v_ms := coalesce((v_item->>'ms')::int, 0);
    v_chosen := v_item->>'chosen';
    v_ok := coalesce((v_item->>'ok')::boolean, false);

    if v_chosen is not null then
      -- Human reaction floor: 250ms minimum per answered question
      if v_ms < 250 then
        raise exception 'INHUMAN_REACTION_TIME';
      end if;

      if v_ok then
        v_ok_count := v_ok_count + 1;
      else
        v_bad_count := v_bad_count + 1;
      end if;

      if v_ms < v_min_ms then v_min_ms := v_ms; end if;
      if v_ms > v_max_ms then v_max_ms := v_ms; end if;
      v_sum_ms := v_sum_ms + v_ms;
    end if;
  end loop;

  if v_ok_count <> p_correct or v_bad_count <> p_wrong then
    raise exception 'ANSWER_LOG_PARITY_MISMATCH';
  end if;

  -- Fixed-interval bot macro check: 6+ answers cannot have < 25ms spread
  if (v_ok_count + v_bad_count) >= 6 and (v_max_ms - v_min_ms) < 25 then
    raise exception 'BOT_TIMING_VARIANCE_DETECTED';
  end if;

  -- Total reaction time cannot exceed match duration + 15s grace
  if v_sum_ms > (p_duration_secs + 15) * 1000 then
    raise exception 'ANSWER_LOG_DURATION_EXCEEDED';
  end if;
end;
$$;

-- 2. start_match: issue authoritative seed
create or replace function public.start_match(p_level int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_fee      int;
  v_coins    int;
  v_match_id uuid;
  v_seed     int := (floor(random() * 2000000000) + 1)::int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select fee into v_fee from public.levels where n = p_level;
  if v_fee is null then raise exception 'BAD_LEVEL'; end if;

  update public.profiles
     set coins = coins - v_fee
   where id = v_uid and coins >= v_fee
   returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;

  insert into public.matches (user_id, level, status, seed)
  values (v_uid, p_level, 'pending', v_seed)
  returning id into v_match_id;

  return jsonb_build_object('match_id', v_match_id, 'coins', v_coins, 'seed', v_seed);
end;
$$;

revoke all on function public.start_match(int) from public;
grant execute on function public.start_match(int) to authenticated;

-- 3. start_duel: issue authoritative seed
create or replace function public.start_duel(p_level int, p_mode text, p_seconds int default 120)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_coins int;
  v_match_id uuid;
  v_level public.levels%rowtype;
  v_secs int := greatest(30, least(600, coalesce(p_seconds, 120)));
  v_lo int;
  v_hi int;
  v_target int;
  v_seed int := (floor(random() * 2000000000) + 1)::int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode <> 'cpu' then raise exception 'BAD_MODE'; end if;
  select * into v_level from public.levels where n = p_level;
  if not found then raise exception 'BAD_LEVEL'; end if;

  update public.profiles
     set coins = coins - v_level.fee
   where id = v_uid and coins >= v_level.fee
   returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;

  v_lo := round(v_level.cpu_min * v_secs / 120.0);
  v_hi := round(v_level.cpu_max * v_secs / 120.0);
  if v_hi <= v_lo then v_hi := v_lo + 1; end if;
  v_target := v_lo + floor(random() * (v_hi - v_lo + 1))::int;

  insert into public.matches (user_id, level, mode, status, opponent_score, duration_seconds, seed)
  values (v_uid, p_level, p_mode, 'pending', v_target, v_secs, v_seed)
  returning id into v_match_id;

  return jsonb_build_object(
    'match_id', v_match_id,
    'coins', v_coins,
    'opponent_target', v_target,
    'seconds', v_secs,
    'seed', v_seed
  );
end;
$$;

revoke all on function public.start_duel(int, text, int) from public;
grant execute on function public.start_duel(int, text, int) to authenticated;

-- 4. finish_match with optional p_answer_log verification
drop function if exists public.finish_match(uuid, int, int, int);

create or replace function public.finish_match(
  p_match_id uuid,
  p_correct int,
  p_wrong int,
  p_attempted int,
  p_answer_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_level public.levels%rowtype;
  v_score int; v_stars int; v_rank int := 1; v_total int; v_prize int := 0; v_coins int;
  v_win boolean; v_streak int; v_mult numeric; v_bonus int := 0; v_xp_gain int; v_xp int;
  v_elapsed numeric;
  v_max_answers int;
  v_names text[] := array['Aarav','Diya','Kabir','Ananya','Vihaan','Sara','Ishaan','Myra','Reyansh','Tara','Arjun','Zoya','Leo','Mia','Omar','Nina','Ravi','Lena','Sam','Noor','Kai','Ada','Finn','Isla','Yash','Ria','Theo','Maya'];
  v_board jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending'
     for update;
  if not found then raise exception 'MATCH_NOT_FOUND_OR_EXPIRED'; end if;

  select * into v_level from public.levels where n = v_match.level;
  if not found then raise exception 'LEVEL_NOT_FOUND'; end if;

  if p_correct < 0 or p_wrong < 0 or p_attempted < 0 then
    raise exception 'NEGATIVE_COUNTERS';
  end if;

  if (p_correct + p_wrong) > p_attempted then
    raise exception 'INCONSISTENT_COUNTERS';
  end if;

  v_elapsed := extract(epoch from (now() - v_match.created_at));

  if v_elapsed < (v_level.time_seconds * 0.70) and (p_correct + p_wrong) > 5 then
    raise exception 'SUBMISSION_TOO_FAST';
  end if;

  v_max_answers := greatest(3, ceil(v_elapsed / 1.2)::int);
  if p_attempted > v_max_answers then
    raise exception 'HUMAN_SPEED_EXCEEDED';
  end if;

  if p_attempted > ceil(v_level.time_seconds / 1.2)::int then
    raise exception 'CAP_EXCEEDED';
  end if;

  perform public.validate_answer_log(p_answer_log, p_correct, p_wrong, p_attempted, v_level.time_seconds);

  v_score := p_correct * 3 - p_wrong;
  v_stars := case
    when v_score >= v_level.star3 then 3
    when v_score >= v_level.star2 then 2
    when v_score >= v_level.star1 then 1
    else 0
  end;

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

  if v_rank <= 10 then v_prize := v_level.fee * 2;
  elsif v_rank <= 25 then v_prize := v_level.fee;
  else v_prize := 0;
  end if;

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

  update public.matches
     set status = 'done',
         score = v_score,
         correct = p_correct,
         wrong = p_wrong,
         attempted = p_attempted,
         rank = v_rank,
         prize = v_prize,
         stars = v_stars,
         answer_log = p_answer_log
   where id = p_match_id;

  insert into public.level_progress (user_id, level, best_stars, best_score)
  values (v_uid, v_match.level, v_stars, v_score)
  on conflict (user_id, level) do update
    set best_stars = greatest(public.level_progress.best_stars, excluded.best_stars),
        best_score = greatest(public.level_progress.best_score, excluded.best_score);

  return jsonb_build_object(
    'score', v_score, 'stars', v_stars, 'rank', v_rank, 'total', v_total,
    'prize', v_prize, 'streak_bonus', v_bonus, 'multiplier', v_mult, 'win_streak', v_streak,
    'xp', v_xp, 'xp_gain', v_xp_gain, 'coins', v_coins, 'unlocked_next', v_stars >= 1, 'board', v_board
  );
end;
$$;

revoke all on function public.finish_match(uuid, int, int, int, jsonb) from public;
grant execute on function public.finish_match(uuid, int, int, int, jsonb) to authenticated;

-- 5. finish_duel with optional p_answer_log verification
drop function if exists public.finish_duel(uuid, int, int, int);

create or replace function public.finish_duel(
  p_match_id uuid,
  p_correct int,
  p_wrong int,
  p_attempted int,
  p_answer_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_fee int; v_score int; v_bot int;
  v_outcome text; v_prize int := 0; v_coins int;
  v_win boolean; v_streak int; v_mult numeric; v_bonus int := 0; v_xp_gain int; v_xp int;
  v_elapsed numeric;
  v_duration int;
  v_max_answers int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending' and mode <> 'arena'
     for update;
  if not found then raise exception 'MATCH_NOT_FOUND_OR_EXPIRED'; end if;

  select fee into v_fee from public.levels where n = v_match.level;
  v_duration := coalesce(v_match.duration_seconds, 120);

  if p_correct < 0 or p_wrong < 0 or p_attempted < 0 then
    raise exception 'NEGATIVE_COUNTERS';
  end if;

  if (p_correct + p_wrong) > p_attempted then
    raise exception 'INCONSISTENT_COUNTERS';
  end if;

  v_elapsed := extract(epoch from (now() - v_match.created_at));
  if v_elapsed < (v_duration * 0.70) and (p_correct + p_wrong) > 5 then
    raise exception 'SUBMISSION_TOO_FAST';
  end if;

  v_max_answers := greatest(3, ceil(v_elapsed / 1.2)::int);
  if p_attempted > v_max_answers then
    raise exception 'HUMAN_SPEED_EXCEEDED';
  end if;

  if p_attempted > ceil(v_duration / 1.2)::int then
    raise exception 'CAP_EXCEEDED';
  end if;

  perform public.validate_answer_log(p_answer_log, p_correct, p_wrong, p_attempted, v_duration);

  v_score := p_correct * 3 - p_wrong;
  v_bot := v_match.opponent_score;

  if v_score > v_bot then
    v_outcome := 'win';
    v_prize := v_fee * 2;
    v_win := true;
  elsif v_score = v_bot then
    v_outcome := 'draw';
    v_prize := v_fee;
    v_win := false;
  else
    v_outcome := 'lose';
    v_prize := 0;
    v_win := false;
  end if;

  select win_streak into v_streak from public.profiles where id = v_uid;
  if v_win then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 0; end if;
  v_mult := public.streak_multiplier(v_streak);
  if v_win then v_bonus := floor(v_prize * (v_mult - 1))::int; else v_bonus := 0; end if;

  v_xp_gain := p_correct * 10 + (case when v_win then 40 else 10 end);

  update public.profiles
     set coins = coins + v_prize + v_bonus,
         win_streak = v_streak,
         best_win_streak = greatest(coalesce(best_win_streak, 0), v_streak),
         xp = coalesce(xp, 0) + v_xp_gain
   where id = v_uid returning coins, xp into v_coins, v_xp;

  update public.matches
     set status = 'done',
         score = v_score,
         correct = p_correct,
         wrong = p_wrong,
         attempted = p_attempted,
         prize = v_prize,
         answer_log = p_answer_log
   where id = p_match_id;

  return jsonb_build_object(
    'player_score', v_score, 'opponent_score', v_bot, 'outcome', v_outcome,
    'prize', v_prize, 'streak_bonus', v_bonus, 'multiplier', v_mult, 'win_streak', v_streak,
    'xp', v_xp, 'xp_gain', v_xp_gain, 'coins', v_coins
  );
end;
$$;

revoke all on function public.finish_duel(uuid, int, int, int, jsonb) from public;
grant execute on function public.finish_duel(uuid, int, int, int, jsonb) to authenticated;
