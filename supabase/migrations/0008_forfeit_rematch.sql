-- ============================================================================
-- Friends rooms: forfeit-on-quit + rematch flow.
--   • Ending a match early = forfeit → ranked last regardless of score.
--   • After a round, players vote "Play Again"; when ALL vote, the room
--     re-charges everyone and starts a fresh round automatically.
-- ============================================================================

alter table public.room_players add column if not exists forfeit boolean not null default false;
alter table public.room_players add column if not exists rematch boolean not null default false;

-- settle: forfeiters always rank below players who finished honestly.
create or replace function public.settle_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room   public.rooms%rowtype;
  v_count  int;
  v_pot    int;
  v_rake   int;
  v_take   int;
  v_winner uuid;
  v_allfin boolean;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' then return; end if;

  v_allfin := not exists (select 1 from public.room_players where room_id = p_room_id and not finished);
  if not v_allfin and now() < v_room.started_at + interval '125 seconds' then return; end if;

  update public.room_players set finished = true, score = coalesce(score, 0)
   where room_id = p_room_id and not finished;

  select count(*) into v_count from public.room_players where room_id = p_room_id;
  v_pot  := v_count * v_room.fee;
  v_rake := floor(v_pot * 0.10)::int;
  v_take := v_pot - v_rake;

  with ranked as (
    select user_id, row_number() over (order by forfeit asc, score desc, joined_at asc) as rk
    from public.room_players where room_id = p_room_id
  )
  update public.room_players rp set place = r.rk
    from ranked r where rp.room_id = p_room_id and rp.user_id = r.user_id;

  select user_id into v_winner from public.room_players where room_id = p_room_id and place = 1;

  update public.profiles set coins = coins + v_take where id = v_winner;
  update public.rooms set status = 'done', pot = v_pot, rake = v_rake, winner = v_winner
   where id = p_room_id;
end;
$$;

-- submit_room_score now takes a forfeit flag.
drop function if exists public.submit_room_score(uuid, int, int, int);
create or replace function public.submit_room_score(
  p_room_id uuid, p_correct int, p_wrong int, p_attempted int, p_forfeit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cap int := floor(120 / 1.2);
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then
    raise exception 'NOT_IN_ROOM';
  end if;
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then raise exception 'INVALID_RESULT'; end if;

  update public.room_players
     set score = p_correct * 3 - p_wrong, finished = true, forfeit = p_forfeit
   where room_id = p_room_id and user_id = v_uid;

  perform public.settle_room(p_room_id);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.submit_room_score(uuid, int, int, int, boolean) from public;
grant execute on function public.submit_room_score(uuid, int, int, int, boolean) to authenticated;

-- try_rematch (internal): if everyone voted, re-charge + start a fresh round.
create or replace function public.try_rematch(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
  v_n    int;
  v_seed int;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'done' then return false; end if;

  select count(*) into v_n from public.room_players where room_id = p_room_id;
  if v_n < 2 then return false; end if;
  if exists (select 1 from public.room_players where room_id = p_room_id and not rematch) then return false; end if;

  -- everyone must afford the new entry
  if exists (
    select 1 from public.room_players rp join public.profiles p on p.id = rp.user_id
     where rp.room_id = p_room_id and p.coins < v_room.fee
  ) then return false; end if;

  update public.profiles set coins = coins - v_room.fee
   where id in (select user_id from public.room_players where room_id = p_room_id);

  v_seed := floor(random() * 2000000000)::int;
  update public.room_players set score = null, finished = false, place = null, forfeit = false, rematch = false
   where room_id = p_room_id;
  update public.rooms set status = 'playing', started_at = now(), seed = v_seed, winner = null, pot = 0, rake = 0
   where id = p_room_id;
  return true;
end;
$$;
revoke all on function public.try_rematch(uuid) from public;  -- internal only

-- vote_rematch: cast a vote; restarts automatically once all have voted.
create or replace function public.vote_rematch(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_restarted boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then
    raise exception 'NOT_IN_ROOM';
  end if;
  update public.room_players set rematch = true where room_id = p_room_id and user_id = v_uid;
  v_restarted := public.try_rematch(p_room_id);
  return jsonb_build_object('restarted', v_restarted);
end;
$$;
revoke all on function public.vote_rematch(uuid) from public;
grant execute on function public.vote_rematch(uuid) to authenticated;

-- leave_room: drop out; promote host if needed; may trigger a pending rematch.
create or replace function public.leave_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_room  public.rooms%rowtype;
  v_left  int;
  v_host  uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then return jsonb_build_object('ok', true); end if;

  delete from public.room_players where room_id = p_room_id and user_id = v_uid;

  select count(*) into v_left from public.room_players where room_id = p_room_id;
  if v_left = 0 then
    delete from public.rooms where id = p_room_id;
    return jsonb_build_object('ok', true);
  end if;

  if v_room.host = v_uid then
    select user_id into v_host from public.room_players where room_id = p_room_id order by joined_at asc limit 1;
    update public.rooms set host = v_host where id = p_room_id;
  end if;

  perform public.try_rematch(p_room_id); -- remaining players may now all be voted
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.leave_room(uuid) from public;
grant execute on function public.leave_room(uuid) to authenticated;
