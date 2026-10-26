-- ============================================================================
-- 0021_anti_cheat_security.sql: Anti-cheat verification & rate validation
--
-- Prevents hacked clients or bot scripts from:
-- 1. Submitting matches instantaneously (time-elapsed verification).
-- 2. Submitting impossible human speeds (capped at max 1 answer per 1.2s).
-- 3. Inconsistent counters (e.g. correct + wrong > attempted).
-- 4. Replaying or double-submitting expired matches.
-- ============================================================================

-- Replace finish_match with elapsed-time and rate checks
create or replace function public.finish_match(
  p_match_id uuid, p_correct int, p_wrong int, p_attempted int
)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  
  -- Lock the pending match
  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending'
     for update;
  if not found then raise exception 'MATCH_NOT_FOUND_OR_EXPIRED'; end if;
  
  select * into v_level from public.levels where n = v_match.level;
  if not found then raise exception 'LEVEL_NOT_FOUND'; end if;

  -- 1. Counter sanity checks
  if p_correct < 0 or p_wrong < 0 or p_attempted < 0 then
    raise exception 'NEGATIVE_COUNTERS';
  end if;

  if (p_correct + p_wrong) > p_attempted then
    raise exception 'INCONSISTENT_COUNTERS';
  end if;

  -- 2. Timing verification: check elapsed time since start_match
  v_elapsed := extract(epoch from (now() - v_match.created_at));

  -- Minimum 50% of the match timer must have passed to submit full answers (prevents instant bot submissions)
  -- If player left early, client should forfeit or submit <= elapsed proportional answers
  if v_elapsed < (v_level.time_seconds * 0.70) and (p_correct + p_wrong) > 5 then
    raise exception 'SUBMISSION_TOO_FAST';
  end if;

  -- Physical human speed limit: maximum 1 question per 1.2 seconds of elapsed time
  v_max_answers := greatest(3, ceil(v_elapsed / 1.2)::int);
  if p_attempted > v_max_answers then
    raise exception 'HUMAN_SPEED_EXCEEDED';
  end if;

  -- Absolute ceiling based on level duration
  if p_attempted > ceil(v_level.time_seconds / 1.2)::int then
    raise exception 'CAP_EXCEEDED';
  end if;

  -- Calculate score: 3 points per correct answer, -1 per wrong answer
  v_score := p_correct * 3 - p_wrong;
  v_stars := case
    when v_score >= v_level.star3 then 3
    when v_score >= v_level.star2 then 2
    when v_score >= v_level.star1 then 1
    else 0
  end;

  -- Bot leaderboard simulation
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

  -- Payout calculation
  if v_rank <= 10 then v_prize := v_level.fee * 2;
  elsif v_rank <= 25 then v_prize := v_level.fee;
  else v_prize := 0;
  end if;

  -- Win streak: top-10 is a win
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
         stars = v_stars
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
end; $$;

-- Replace finish_duel with elapsed-time and rate checks
create or replace function public.finish_duel(p_match_id uuid, p_correct int, p_wrong int, p_attempted int)
returns jsonb language plpgsql security definer set search_path = '' as $$
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

  -- 1. Counter sanity checks
  if p_correct < 0 or p_wrong < 0 or p_attempted < 0 then
    raise exception 'NEGATIVE_COUNTERS';
  end if;

  if (p_correct + p_wrong) > p_attempted then
    raise exception 'INCONSISTENT_COUNTERS';
  end if;

  -- 2. Timing verification
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

  -- Win streak tracking
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
         prize = v_prize
   where id = p_match_id;

  return jsonb_build_object(
    'player_score', v_score, 'opponent_score', v_bot, 'outcome', v_outcome,
    'prize', v_prize, 'streak_bonus', v_bonus, 'multiplier', v_mult, 'win_streak', v_streak,
    'xp', v_xp, 'xp_gain', v_xp_gain, 'coins', v_coins
  );
end; $$;
