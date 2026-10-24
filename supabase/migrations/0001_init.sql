-- ============================================================================
-- MathBlitz — initial schema
-- Server-authoritative coin economy. The client never writes coins directly;
-- only the SECURITY DEFINER functions below mutate balances, and they each
-- verify auth.uid(). Score is RECOMPUTED server-side from correct/wrong counts.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- levels: public config + source of truth for the economy
-- ---------------------------------------------------------------------------
create table if not exists public.levels (
  n            int primary key,
  name         text not null,
  band         text not null,
  cls          int[] not null,            -- class bands this level draws from
  time_seconds int  not null,
  star1        int  not null,             -- score thresholds for 1/2/3 stars
  star2        int  not null,
  star3        int  not null,
  fee          int  not null,             -- entry cost in coins
  payout       int[] not null,            -- [1st, 2nd, 3rd] prizes
  bot_min      int  not null,             -- bot score range for the leaderboard
  bot_max      int  not null
);

alter table public.levels enable row level security;

drop policy if exists "levels are readable by everyone" on public.levels;
create policy "levels are readable by everyone"
  on public.levels for select
  to anon, authenticated
  using (true);

grant select on public.levels to anon, authenticated;

insert into public.levels (n, name, band, cls, time_seconds, star1, star2, star3, fee, payout, bot_min, bot_max) values
  (1, 'Rookie', 'Classes 6–7',   '{6,7}',    120, 25, 50, 75,  10,  '{40,20,10}',   20, 55),
  (2, 'Sharp',  'Classes 7–8',   '{7,8}',    120, 25, 50, 75,  25,  '{100,50,25}',  22, 58),
  (3, 'Rapid',  'Classes 8–9',   '{8,9}',    150, 25, 48, 72,  40,  '{160,80,40}',  24, 60),
  (4, 'Pro',    'Class 9',       '{9}',      180, 22, 45, 68,  60,  '{240,120,60}', 22, 58),
  (5, 'Ace',    'Classes 9–10',  '{9,10}',   180, 22, 45, 66,  90,  '{360,180,90}', 24, 62),
  (6, 'Elite',  'All · hardest', '{8,9,10}', 210, 24, 48, 72,  130, '{520,260,130}',26, 66)
on conflict (n) do nothing;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user. Coins live here (server-managed).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  coins      int not null default 500,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-level grants: clients may change their username but NOT their coins.
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;

-- Auto-create a profile (with a starter balance) on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, coins)
  values (new.id, 'Player' || substr(new.id::text, 1, 4), 500)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- matches: every match attempt. 'pending' on start, 'done' on finish.
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  level      int  not null references public.levels(n),
  status     text not null default 'pending' check (status in ('pending','done')),
  score      int  not null default 0,
  correct    int  not null default 0,
  wrong      int  not null default 0,
  attempted  int  not null default 0,
  rank       int  not null default 0,
  prize      int  not null default 0,
  stars      int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists matches_leaderboard_idx
  on public.matches (level, created_at desc) where status = 'done';

alter table public.matches enable row level security;

drop policy if exists "read own matches" on public.matches;
create policy "read own matches"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.matches to authenticated;
-- No insert/update grants: matches are written only by the functions below.

-- ---------------------------------------------------------------------------
-- level_progress: best stars + score per (user, level)
-- ---------------------------------------------------------------------------
create table if not exists public.level_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  level      int  not null references public.levels(n),
  best_stars int  not null default 0,
  best_score int  not null default 0,
  primary key (user_id, level)
);

alter table public.level_progress enable row level security;

drop policy if exists "read own progress" on public.level_progress;
create policy "read own progress"
  on public.level_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.level_progress to authenticated;

-- ============================================================================
-- ECONOMY FUNCTIONS (SECURITY DEFINER — bypass RLS, verify auth.uid() inside)
-- ============================================================================

-- start_match: atomically charge the entry fee and open a pending match.
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
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select fee into v_fee from public.levels where n = p_level;
  if v_fee is null then raise exception 'BAD_LEVEL'; end if;

  -- Deduct only if the balance covers it (atomic; no race).
  update public.profiles
     set coins = coins - v_fee
   where id = v_uid and coins >= v_fee
   returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;

  insert into public.matches (user_id, level, status)
  values (v_uid, p_level, 'pending')
  returning id into v_match_id;

  return jsonb_build_object('match_id', v_match_id, 'coins', v_coins);
end;
$$;

-- finish_match: recompute score server-side, rank vs bots, award prize,
-- finalise the match, and upsert progress — all in one transaction.
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
  v_rank   int := 1;
  v_prize  int := 0;
  v_cap    int;
  v_coins  int;
  v_names  text[] := array['Aarav','Diya','Kabir','Ananya','Vihaan','Sara','Ishaan','Myra','Reyansh','Tara','Arjun','Zoya','Leo','Mia','Omar','Nina'];
  v_bots   jsonb := '[]'::jsonb;
  v_bscore int;
  i        int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match
    from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending'
   for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;

  select * into v_level from public.levels where n = v_match.level;

  -- Anti-cheat sanity guard: cap plausible question count for the time given.
  v_cap := floor(v_level.time_seconds / 1.2);
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then
    raise exception 'INVALID_RESULT';
  end if;

  -- Score is computed here, never trusted from the client.
  v_score := p_correct * 3 - p_wrong;
  v_stars := case
    when v_score >= v_level.star3 then 3
    when v_score >= v_level.star2 then 2
    when v_score >= v_level.star1 then 1
    else 0 end;

  -- Generate 7 bots; rank = 1 + (bots that beat the player).
  for i in 1..7 loop
    v_bscore := v_level.bot_min + floor(random() * (v_level.bot_max - v_level.bot_min + 1))::int;
    if v_bscore > v_score then v_rank := v_rank + 1; end if;
    v_bots := v_bots || jsonb_build_object(
      'name', v_names[1 + floor(random() * array_length(v_names, 1))::int],
      'score', v_bscore);
  end loop;

  if v_rank <= 3 then v_prize := (v_level.payout)[v_rank]; end if;

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
    'score', v_score, 'stars', v_stars, 'rank', v_rank, 'prize', v_prize,
    'coins', v_coins, 'unlocked_next', v_stars >= 1, 'bots', v_bots);
end;
$$;

-- get_daily_leaderboard: today's top scores for a level (real players).
create or replace function public.get_daily_leaderboard(p_level int)
returns table(username text, best int)
language sql
security definer
set search_path = ''
as $$
  select p.username, max(m.score)::int as best
    from public.matches m
    join public.profiles p on p.id = m.user_id
   where m.level = p_level and m.status = 'done'
     and m.created_at >= date_trunc('day', now())
   group by p.username
   order by best desc
   limit 50;
$$;

-- Lock down execution: authenticated users only (functions verify uid inside).
revoke all on function public.start_match(int) from public;
revoke all on function public.finish_match(uuid, int, int, int) from public;
revoke all on function public.get_daily_leaderboard(int) from public;
grant execute on function public.start_match(int) to authenticated;
grant execute on function public.finish_match(uuid, int, int, int) to authenticated;
grant execute on function public.get_daily_leaderboard(int) to authenticated;
