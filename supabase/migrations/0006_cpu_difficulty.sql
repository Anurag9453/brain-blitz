-- ============================================================================
-- Make the vs-Computer bot harder (but still beatable), and make its strength
-- tunable per level via columns on `levels` — so future tweaks are a one-line
-- UPDATE, no function change.
--   cpu_min / cpu_max = the bot's final-score range for a 120s duel.
-- ============================================================================

alter table public.levels add column if not exists cpu_min int not null default 90;
alter table public.levels add column if not exists cpu_max int not null default 115;

-- Harder targets. Higher levels have tougher questions, so fewer points fit.
update public.levels set cpu_min = 90, cpu_max = 115 where n = 1;
update public.levels set cpu_min = 84, cpu_max = 108 where n = 2;
update public.levels set cpu_min = 76, cpu_max = 100 where n = 3;
update public.levels set cpu_min = 68, cpu_max = 90  where n = 4;
update public.levels set cpu_min = 62, cpu_max = 84  where n = 5;
update public.levels set cpu_min = 56, cpu_max = 78  where n = 6;

-- start_duel now reads the bot range from the level row.
create or replace function public.start_duel(p_level int, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_fee      int  := 100;
  v_coins    int;
  v_match_id uuid;
  v_level    public.levels%rowtype;
  v_target   int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode <> 'cpu' then raise exception 'BAD_MODE'; end if;

  select * into v_level from public.levels where n = p_level;
  if not found then raise exception 'BAD_LEVEL'; end if;

  update public.profiles set coins = coins - v_fee
   where id = v_uid and coins >= v_fee
   returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;

  v_target := v_level.cpu_min + floor(random() * (v_level.cpu_max - v_level.cpu_min + 1))::int;

  insert into public.matches (user_id, level, mode, status, opponent_score)
  values (v_uid, p_level, p_mode, 'pending', v_target)
  returning id into v_match_id;

  return jsonb_build_object('match_id', v_match_id, 'coins', v_coins, 'opponent_target', v_target);
end;
$$;
