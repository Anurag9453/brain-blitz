-- ============================================================================
-- Friends rooms carry the host's chosen subject (maths / physics / chemistry /
-- mixed), so every player in the room generates the same questions.
-- ============================================================================

alter table public.rooms add column if not exists subject text not null default 'mixed';

-- create_room gains a subject argument.
drop function if exists public.create_room(int);
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
  v_id   uuid;
  v_try  int := 0;
  v_sub  text := lower(coalesce(p_subject, 'mixed'));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.levels where n = p_level) then raise exception 'BAD_LEVEL'; end if;
  if v_sub not in ('maths', 'physics', 'chemistry', 'mixed') then v_sub := 'mixed'; end if;
  select username into v_name from public.profiles where id = v_uid;

  loop
    v_try := v_try + 1;
    v_code := upper(substr(md5(random()::text), 1, 6));
    begin
      insert into public.rooms (code, host, level, seed, subject) values (v_code, v_uid, p_level, v_seed, v_sub)
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
revoke all on function public.create_room(int, text) from public;
grant execute on function public.create_room(int, text) to authenticated;

-- get_room returns the subject too.
create or replace function public.get_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_room    public.rooms%rowtype;
  v_players jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then
    raise exception 'NOT_IN_ROOM';
  end if;

  select jsonb_agg(jsonb_build_object(
           'user_id', user_id, 'username', username, 'score', score,
           'finished', finished, 'place', place
         ) order by coalesce(place, 99), joined_at)
    into v_players
    from public.room_players where room_id = p_room_id;

  return jsonb_build_object(
    'id', v_room.id, 'code', v_room.code, 'level', v_room.level, 'status', v_room.status,
    'seed', v_room.seed, 'fee', v_room.fee, 'pot', v_room.pot, 'rake', v_room.rake,
    'winner', v_room.winner, 'host', v_room.host, 'is_host', (v_room.host = v_uid), 'you', v_uid,
    'subject', v_room.subject, 'players', coalesce(v_players, '[]'::jsonb));
end;
$$;
