-- ============================================================================
-- Entry fee is the LEVEL's fee for ALL match types (not a flat 100 for duels
-- and friends). vs Computer: beat the bot → 2× entry; draw → refund; lose → −entry.
-- Friends: each player stakes the level fee; winner takes the pot − 10% rake.
-- ============================================================================

-- vs Computer: charge the level's fee.
create or replace function public.start_duel(p_level int, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_coins    int;
  v_match_id uuid;
  v_level    public.levels%rowtype;
  v_target   int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode <> 'cpu' then raise exception 'BAD_MODE'; end if;

  select * into v_level from public.levels where n = p_level;
  if not found then raise exception 'BAD_LEVEL'; end if;

  update public.profiles set coins = coins - v_level.fee
   where id = v_uid and coins >= v_level.fee
   returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;

  v_target := v_level.cpu_min + floor(random() * (v_level.cpu_max - v_level.cpu_min + 1))::int;

  insert into public.matches (user_id, level, mode, status, opponent_score)
  values (v_uid, p_level, p_mode, 'pending', v_target)
  returning id into v_match_id;

  return jsonb_build_object('match_id', v_match_id, 'coins', v_coins, 'opponent_target', v_target);
end;
$$;

-- vs Computer settlement: win → 2× fee, draw → refund fee, lose → 0.
create or replace function public.finish_duel(
  p_match_id uuid, p_correct int, p_wrong int, p_attempted int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_match   public.matches%rowtype;
  v_fee     int;
  v_score   int;
  v_bot     int;
  v_outcome text;
  v_prize   int := 0;
  v_coins   int;
  v_cap     int := floor(120 / 1.2);
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending' and mode <> 'arena' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;

  select fee into v_fee from public.levels where n = v_match.level;

  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then raise exception 'INVALID_RESULT'; end if;

  v_score := p_correct * 3 - p_wrong;
  v_bot := v_match.opponent_score;

  if v_score > v_bot then v_outcome := 'win'; v_prize := v_fee * 2;
  elsif v_score = v_bot then v_outcome := 'draw'; v_prize := v_fee;
  else v_outcome := 'lose'; v_prize := 0; end if;

  update public.profiles set coins = coins + v_prize where id = v_uid returning coins into v_coins;

  update public.matches
     set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong,
         attempted = p_attempted, prize = v_prize
   where id = p_match_id;

  return jsonb_build_object(
    'player_score', v_score, 'opponent_score', v_bot,
    'outcome', v_outcome, 'prize', v_prize, 'coins', v_coins);
end;
$$;

-- Friends: room stake = the level's fee.
create or replace function public.create_room(p_level int, p_subject text default 'mixed')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_code text;
  v_seed int := floor(random() * 2000000000)::int;
  v_fee  int;
  v_id   uuid;
  v_try  int := 0;
  v_sub  text := lower(coalesce(p_subject, 'mixed'));
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
      insert into public.rooms (code, host, level, seed, subject, fee)
      values (v_code, v_uid, p_level, v_seed, v_sub, v_fee)
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try > 5 then raise exception 'CODE_COLLISION'; end if;
    end;
  end loop;

  insert into public.room_players (room_id, user_id, username) values (v_id, v_uid, coalesce(v_name, 'Player'));
  return jsonb_build_object('room_id', v_id, 'code', v_code);
end;
$$;
