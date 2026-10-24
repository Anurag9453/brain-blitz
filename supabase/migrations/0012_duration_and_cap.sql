-- ============================================================================
-- (1) Fix the over-tight anti-cheat cap that flagged fast players as INVALID.
--     New cap = duration × 4 (catches only absurd values, never real play).
-- (2) Match length for 1-on-1 modes: vs Computer & Friends can be 1/2/3/5 min.
--     Arena keeps the level timer. Bot target scales with the chosen length.
-- ============================================================================

alter table public.matches add column if not exists duration_seconds int not null default 120;
alter table public.rooms   add column if not exists duration_seconds int not null default 120;

-- ---- Arena: looser cap ----
create or replace function public.finish_match(
  p_match_id uuid, p_correct int, p_wrong int, p_attempted int
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_level public.levels%rowtype;
  v_score int; v_stars int; v_rank int := 1; v_total int; v_prize int := 0; v_cap int; v_coins int;
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
  update public.profiles set coins = coins + v_prize where id = v_uid returning coins into v_coins;
  update public.matches set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong, attempted = p_attempted, rank = v_rank, prize = v_prize, stars = v_stars where id = p_match_id;
  insert into public.level_progress (user_id, level, best_stars, best_score) values (v_uid, v_match.level, v_stars, v_score)
  on conflict (user_id, level) do update set best_stars = greatest(public.level_progress.best_stars, excluded.best_stars), best_score = greatest(public.level_progress.best_score, excluded.best_score);
  return jsonb_build_object('score', v_score, 'stars', v_stars, 'rank', v_rank, 'total', v_total, 'prize', v_prize, 'coins', v_coins, 'unlocked_next', v_stars >= 1, 'board', v_board);
end; $$;

-- ---- vs Computer: choose length; bot target scales; looser cap ----
drop function if exists public.start_duel(int, text);
create or replace function public.start_duel(p_level int, p_mode text, p_seconds int default 120)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_coins int; v_match_id uuid; v_level public.levels%rowtype;
  v_secs int := greatest(30, least(600, coalesce(p_seconds, 120)));
  v_lo int; v_hi int; v_target int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode <> 'cpu' then raise exception 'BAD_MODE'; end if;
  select * into v_level from public.levels where n = p_level;
  if not found then raise exception 'BAD_LEVEL'; end if;
  update public.profiles set coins = coins - v_level.fee where id = v_uid and coins >= v_level.fee returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;
  -- bot target is calibrated for 120s; scale it to the chosen length
  v_lo := round(v_level.cpu_min * v_secs / 120.0);
  v_hi := round(v_level.cpu_max * v_secs / 120.0);
  if v_hi <= v_lo then v_hi := v_lo + 1; end if;
  v_target := v_lo + floor(random() * (v_hi - v_lo + 1))::int;
  insert into public.matches (user_id, level, mode, status, opponent_score, duration_seconds)
  values (v_uid, p_level, p_mode, 'pending', v_target, v_secs) returning id into v_match_id;
  return jsonb_build_object('match_id', v_match_id, 'coins', v_coins, 'opponent_target', v_target, 'seconds', v_secs);
end; $$;
revoke all on function public.start_duel(int, text, int) from public;
grant execute on function public.start_duel(int, text, int) to authenticated;

create or replace function public.finish_duel(p_match_id uuid, p_correct int, p_wrong int, p_attempted int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_match public.matches%rowtype; v_fee int; v_score int; v_bot int; v_outcome text; v_prize int := 0; v_coins int; v_cap int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_match from public.matches where id = p_match_id and user_id = v_uid and status = 'pending' and mode <> 'arena' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  select fee into v_fee from public.levels where n = v_match.level;
  v_cap := coalesce(v_match.duration_seconds, 120) * 4;
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then raise exception 'INVALID_RESULT'; end if;
  v_score := p_correct * 3 - p_wrong; v_bot := v_match.opponent_score;
  if v_score > v_bot then v_outcome := 'win'; v_prize := v_fee * 2; elsif v_score = v_bot then v_outcome := 'draw'; v_prize := v_fee; else v_outcome := 'lose'; v_prize := 0; end if;
  update public.profiles set coins = coins + v_prize where id = v_uid returning coins into v_coins;
  update public.matches set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong, attempted = p_attempted, prize = v_prize where id = p_match_id;
  return jsonb_build_object('player_score', v_score, 'opponent_score', v_bot, 'outcome', v_outcome, 'prize', v_prize, 'coins', v_coins);
end; $$;

-- ---- Friends: host chooses room length; looser cap ----
drop function if exists public.create_room(int, text);
create or replace function public.create_room(p_level int, p_subject text default 'mixed', p_seconds int default 120)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_name text; v_code text; v_seed int := floor(random() * 2000000000)::int;
  v_fee int; v_id uuid; v_try int := 0; v_sub text := lower(coalesce(p_subject, 'mixed'));
  v_secs int := greatest(30, least(600, coalesce(p_seconds, 120)));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select fee into v_fee from public.levels where n = p_level;
  if v_fee is null then raise exception 'BAD_LEVEL'; end if;
  if v_sub not in ('maths', 'physics', 'chemistry', 'mixed') then v_sub := 'mixed'; end if;
  select username into v_name from public.profiles where id = v_uid;
  loop
    v_try := v_try + 1;
    v_code := upper(substr(md5(random()::text), 1, 6));
    begin
      insert into public.rooms (code, host, level, seed, subject, fee, duration_seconds)
      values (v_code, v_uid, p_level, v_seed, v_sub, v_fee, v_secs) returning id into v_id;
      exit;
    exception when unique_violation then if v_try > 5 then raise exception 'CODE_COLLISION'; end if;
    end;
  end loop;
  insert into public.room_players (room_id, user_id, username) values (v_id, v_uid, coalesce(v_name, 'Player'));
  return jsonb_build_object('room_id', v_id, 'code', v_code);
end; $$;
revoke all on function public.create_room(int, text, int) from public;
grant execute on function public.create_room(int, text, int) to authenticated;

create or replace function public.submit_room_score(p_room_id uuid, p_correct int, p_wrong int, p_attempted int, p_forfeit boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_cap int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then raise exception 'NOT_IN_ROOM'; end if;
  select coalesce(duration_seconds, 120) * 4 into v_cap from public.rooms where id = p_room_id;
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > coalesce(v_cap, 480) then raise exception 'INVALID_RESULT'; end if;
  update public.room_players set score = p_correct * 3 - p_wrong, finished = true, forfeit = p_forfeit where room_id = p_room_id and user_id = v_uid;
  perform public.settle_room(p_room_id);
  return jsonb_build_object('ok', true);
end; $$;

-- ---- get_room returns the room's duration ----
create or replace function public.get_room(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_room public.rooms%rowtype; v_players jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then raise exception 'NOT_IN_ROOM'; end if;
  select jsonb_agg(jsonb_build_object('user_id', user_id, 'username', username, 'score', score, 'finished', finished, 'place', place) order by coalesce(place, 99), joined_at)
    into v_players from public.room_players where room_id = p_room_id;
  return jsonb_build_object('id', v_room.id, 'code', v_room.code, 'level', v_room.level, 'status', v_room.status,
    'seed', v_room.seed, 'fee', v_room.fee, 'pot', v_room.pot, 'rake', v_room.rake, 'winner', v_room.winner,
    'host', v_room.host, 'is_host', (v_room.host = v_uid), 'you', v_uid, 'subject', v_room.subject,
    'duration_seconds', v_room.duration_seconds, 'players', coalesce(v_players, '[]'::jsonb));
end; $$;
