-- ============================================================================
-- Economy v3
--   • Starter balance 1000 (and reset existing test accounts to 1000).
--   • New Arena entry-fee ladder.
--   • Arena payout: top 10 win DOUBLE the entry (was 10×); 11–25 break even;
--     26+ lose the entry.
--   • vs-Computer (100 → 200) and Friends (flat 100, winner-takes-pot) unchanged.
-- ============================================================================

-- ---- entry-fee ladder ----
update public.levels set fee = 100    where n = 1;
update public.levels set fee = 2500   where n = 2;
update public.levels set fee = 5000   where n = 3;
update public.levels set fee = 25000  where n = 4;
update public.levels set fee = 50000  where n = 5;
update public.levels set fee = 100000 where n = 6;

-- ---- starter balance 1000 (reset all current test accounts) ----
alter table public.profiles alter column coins set default 1000;
update public.profiles set coins = 1000;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, coins)
  values (new.id, 'Player' || substr(new.id::text, 1, 4), 1000)
  on conflict (id) do nothing;
  return new;
end;
$$;

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
    'daily_streak', coalesce(v_p.daily_streak, 0),
    'daily_available', (v_p.last_daily is distinct from current_date));
end;
$$;

-- ---- Arena payout: top 10 win 2× entry ----
create or replace function public.finish_match(
  p_match_id uuid, p_correct int, p_wrong int, p_attempted int
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_match  public.matches%rowtype;
  v_level  public.levels%rowtype;
  v_score  int;
  v_stars  int;
  v_rank   int := 1;
  v_total  int;
  v_prize  int := 0;
  v_cap    int;
  v_coins  int;
  v_names  text[] := array['Aarav','Diya','Kabir','Ananya','Vihaan','Sara','Ishaan','Myra','Reyansh','Tara','Arjun','Zoya','Leo','Mia','Omar','Nina','Ravi','Lena','Sam','Noor','Kai','Ada','Finn','Isla','Yash','Ria','Theo','Maya'];
  v_board  jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;

  select * into v_level from public.levels where n = v_match.level;

  v_cap := floor(v_level.time_seconds / 1.2);
  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then raise exception 'INVALID_RESULT'; end if;

  v_score := p_correct * 3 - p_wrong;
  v_stars := case
    when v_score >= v_level.star3 then 3
    when v_score >= v_level.star2 then 2
    when v_score >= v_level.star1 then 1
    else 0 end;

  with bots as (
    select v_names[1 + floor(random() * array_length(v_names, 1))::int] as name,
           (v_level.bot_min + floor(random() * (v_level.bot_max - v_level.bot_min + 1)))::int as score,
           false as you
    from generate_series(1, 49)
  ),
  allp as (
    select name, score, you from bots
    union all select 'You', v_score, true
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

  if v_rank > 10 then
    v_board := v_board || jsonb_build_object('rank', v_rank, 'name', 'You', 'score', v_score, 'you', true);
  end if;

  if v_rank <= 10 then v_prize := v_level.fee * 2;      -- win double
  elsif v_rank <= 25 then v_prize := v_level.fee;       -- break even
  else v_prize := 0; end if;                            -- lose entry

  update public.profiles set coins = coins + v_prize where id = v_uid returning coins into v_coins;

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
