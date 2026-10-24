-- ============================================================================
-- Duels: head-to-head modes. Phase A ships "vs Computer" (mode = 'cpu').
--   • Flat 100-coin entry.  Win → +200 (net +100) · Draw → refund · Lose → −100.
--   • The bot's target score is decided SERVER-SIDE at start (house can't be
--     gamed by a faked low opponent score). 2-minute duel regardless of level;
--     the level only sets question difficulty.
-- ============================================================================

alter table public.matches add column if not exists mode           text not null default 'arena';
alter table public.matches add column if not exists opponent_score int;

-- start_duel: charge the flat entry and roll the bot's target score.
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
  v_lo       int;
  v_hi       int;
  v_target   int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mode <> 'cpu' then raise exception 'BAD_MODE'; end if; -- only vs-Computer for now
  if not exists (select 1 from public.levels where n = p_level) then raise exception 'BAD_LEVEL'; end if;

  update public.profiles set coins = coins - v_fee
   where id = v_uid and coins >= v_fee
   returning coins into v_coins;
  if not found then raise exception 'INSUFFICIENT_COINS'; end if;

  -- Smart-bot target for a 120s duel, by difficulty (tunable). Hard but beatable.
  v_lo := case p_level when 1 then 70 when 2 then 66 when 3 then 60 when 4 then 54 when 5 then 50 else 48 end;
  v_hi := case p_level when 1 then 92 when 2 then 86 when 3 then 80 when 4 then 72 when 5 then 68 else 64 end;
  v_target := v_lo + floor(random() * (v_hi - v_lo + 1))::int;

  insert into public.matches (user_id, level, mode, status, opponent_score)
  values (v_uid, p_level, p_mode, 'pending', v_target)
  returning id into v_match_id;

  return jsonb_build_object('match_id', v_match_id, 'coins', v_coins, 'opponent_target', v_target);
end;
$$;
revoke all on function public.start_duel(int, text) from public;
grant execute on function public.start_duel(int, text) to authenticated;

-- finish_duel: settle player score vs the (server-set) bot score.
create or replace function public.finish_duel(
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
  v_uid     uuid := auth.uid();
  v_match   public.matches%rowtype;
  v_score   int;
  v_bot     int;
  v_outcome text;
  v_prize   int := 0;
  v_coins   int;
  v_cap     int := floor(120 / 1.2); -- duels are a fixed 120s
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_match from public.matches
   where id = p_match_id and user_id = v_uid and status = 'pending' and mode <> 'arena' for update;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;

  if p_correct < 0 or p_wrong < 0 or (p_correct + p_wrong) > v_cap then
    raise exception 'INVALID_RESULT';
  end if;

  v_score := p_correct * 3 - p_wrong;
  v_bot := v_match.opponent_score;

  if v_score > v_bot then v_outcome := 'win'; v_prize := 200;     -- net +100
  elsif v_score = v_bot then v_outcome := 'draw'; v_prize := 100; -- refund
  else v_outcome := 'lose'; v_prize := 0; end if;                 -- lost entry

  update public.profiles set coins = coins + v_prize
   where id = v_uid returning coins into v_coins;

  update public.matches
     set status = 'done', score = v_score, correct = p_correct, wrong = p_wrong,
         attempted = p_attempted, prize = v_prize
   where id = p_match_id;

  return jsonb_build_object(
    'player_score', v_score, 'opponent_score', v_bot,
    'outcome', v_outcome, 'prize', v_prize, 'coins', v_coins);
end;
$$;
revoke all on function public.finish_duel(uuid, int, int, int) from public;
grant execute on function public.finish_duel(uuid, int, int, int) to authenticated;
