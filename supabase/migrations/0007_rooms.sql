-- ============================================================================
-- Play with Friends: private rooms (up to 4), shared seeded questions,
-- winner-takes-pot minus a 10% house rake.
--
-- Clients never read these tables directly — all access is via the SECURITY
-- DEFINER functions below (each verifies the caller is a participant). RLS is
-- enabled with no client policies, so the tables are private by default.
-- ============================================================================

create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  host       uuid not null references auth.users(id) on delete cascade,
  level      int  not null references public.levels(n),
  status     text not null default 'lobby' check (status in ('lobby','playing','done')),
  fee        int  not null default 100,
  seed       int  not null,
  pot        int  not null default 0,
  rake       int  not null default 0,
  winner     uuid,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  username  text not null,
  score     int,
  finished  boolean not null default false,
  place     int,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
-- No client policies: access only through the functions below.

-- ---- settle: pick winner, take rake, pay the pot. Idempotent + guarded. ----
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
  -- Only settle when everyone has finished, or the clock has run out (+grace).
  if not v_allfin and now() < v_room.started_at + interval '125 seconds' then
    return;
  end if;

  -- Treat any non-submitters as 0.
  update public.room_players set finished = true, score = coalesce(score, 0)
   where room_id = p_room_id and not finished;

  select count(*) into v_count from public.room_players where room_id = p_room_id;
  v_pot  := v_count * v_room.fee;
  v_rake := floor(v_pot * 0.10)::int;          -- 10% house rake
  v_take := v_pot - v_rake;

  -- Rank players; highest score wins, ties broken by who joined first.
  with ranked as (
    select user_id, row_number() over (order by score desc, joined_at asc) as rk
    from public.room_players where room_id = p_room_id
  )
  update public.room_players rp set place = r.rk
    from ranked r where rp.room_id = p_room_id and rp.user_id = r.user_id;

  select user_id into v_winner from public.room_players
   where room_id = p_room_id and place = 1;

  update public.profiles set coins = coins + v_take where id = v_winner;
  update public.rooms set status = 'done', pot = v_pot, rake = v_rake, winner = v_winner
   where id = p_room_id;
end;
$$;
revoke all on function public.settle_room(uuid) from public;  -- internal only

-- ---- create_room: host opens a lobby at a chosen level ----
create or replace function public.create_room(p_level int)
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
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.levels where n = p_level) then raise exception 'BAD_LEVEL'; end if;
  select username into v_name from public.profiles where id = v_uid;

  loop
    v_try := v_try + 1;
    v_code := upper(substr(md5(random()::text), 1, 6));
    begin
      insert into public.rooms (code, host, level, seed) values (v_code, v_uid, p_level, v_seed)
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
revoke all on function public.create_room(int) from public;
grant execute on function public.create_room(int) to authenticated;

-- ---- join_room: enter a lobby by code ----
create or replace function public.join_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_room public.rooms%rowtype;
  v_n    int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where code = upper(p_code) for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'lobby' then raise exception 'ROOM_STARTED'; end if;

  if exists (select 1 from public.room_players where room_id = v_room.id and user_id = v_uid) then
    return jsonb_build_object('room_id', v_room.id); -- already in
  end if;

  select count(*) into v_n from public.room_players where room_id = v_room.id;
  if v_n >= 4 then raise exception 'ROOM_FULL'; end if;

  select username into v_name from public.profiles where id = v_uid;
  insert into public.room_players (room_id, user_id, username) values (v_room.id, v_uid, coalesce(v_name, 'Player'));
  return jsonb_build_object('room_id', v_room.id);
end;
$$;
revoke all on function public.join_room(text) from public;
grant execute on function public.join_room(text) to authenticated;

-- ---- start_room: host charges everyone and kicks off the match ----
create or replace function public.start_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_n    int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host <> v_uid then raise exception 'NOT_HOST'; end if;
  if v_room.status <> 'lobby' then raise exception 'ALREADY_STARTED'; end if;

  select count(*) into v_n from public.room_players where room_id = p_room_id;
  if v_n < 2 then raise exception 'NEED_PLAYERS'; end if;

  if exists (
    select 1 from public.room_players rp join public.profiles p on p.id = rp.user_id
     where rp.room_id = p_room_id and p.coins < v_room.fee
  ) then raise exception 'SOMEONE_BROKE'; end if;

  update public.profiles set coins = coins - v_room.fee
   where id in (select user_id from public.room_players where room_id = p_room_id);

  update public.rooms set status = 'playing', started_at = now() where id = p_room_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.start_room(uuid) from public;
grant execute on function public.start_room(uuid) to authenticated;

-- ---- submit_room_score: record a player's score; settle when all are in ----
create or replace function public.submit_room_score(p_room_id uuid, p_correct int, p_wrong int, p_attempted int)
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
     set score = p_correct * 3 - p_wrong, finished = true
   where room_id = p_room_id and user_id = v_uid;

  perform public.settle_room(p_room_id);  -- settles if everyone is done
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.submit_room_score(uuid, int, int, int) from public;
grant execute on function public.submit_room_score(uuid, int, int, int) to authenticated;

-- ---- finalize_room: fallback settle once the clock is up (any participant) ----
create or replace function public.finalize_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.room_players where room_id = p_room_id and user_id = v_uid) then
    raise exception 'NOT_IN_ROOM';
  end if;
  perform public.settle_room(p_room_id);  -- guarded: only settles if all done OR time up
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.finalize_room(uuid) from public;
grant execute on function public.finalize_room(uuid) to authenticated;

-- ---- get_room: full room snapshot for polling (participants only) ----
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
    'players', coalesce(v_players, '[]'::jsonb));
end;
$$;
revoke all on function public.get_room(uuid) from public;
grant execute on function public.get_room(uuid) to authenticated;
