-- 0014: the daily reward becomes a one-question challenge.
-- The client shows a question; only a correct answer claims the reward.
--   • streak <  7  → 1,000 ₵
--   • streak >= 7  → 5,000 ₵
--   • streak >= 30 → 10,000 ₵
-- A correct answer advances the streak; a wrong answer spends the day's
-- attempt, awards nothing, and resets the streak to 0.

-- Signature changes (adds a parameter), so drop the old no-arg version first.
drop function if exists public.claim_daily_bonus();

create or replace function public.claim_daily_bonus(p_correct boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_last   date;
  v_streak int;
  v_today  date := current_date;
  v_amount int;
  v_coins  int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select last_daily, daily_streak into v_last, v_streak
    from public.profiles where id = v_uid for update;

  if v_last = v_today then
    return jsonb_build_object('claimed', false, 'reason', 'ALREADY_CLAIMED');
  end if;

  -- Wrong answer: today's attempt is spent, the streak breaks, no coins.
  if not coalesce(p_correct, false) then
    update public.profiles
       set last_daily = v_today, daily_streak = 0
     where id = v_uid
     returning coins into v_coins;
    return jsonb_build_object('claimed', false, 'reason', 'WRONG', 'amount', 0, 'streak', 0, 'coins', v_coins);
  end if;

  -- Correct: a consecutive day keeps the streak, otherwise it restarts at 1.
  if v_last = v_today - 1 then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 1; end if;

  -- Streak-scaled reward.
  if    v_streak >= 30 then v_amount := 10000;
  elsif v_streak >= 7  then v_amount := 5000;
  else                      v_amount := 1000;
  end if;

  update public.profiles
     set coins = coins + v_amount, last_daily = v_today, daily_streak = v_streak
   where id = v_uid
   returning coins into v_coins;

  return jsonb_build_object('claimed', true, 'amount', v_amount, 'streak', v_streak, 'coins', v_coins);
end;
$$;
revoke all on function public.claim_daily_bonus(boolean) from public;
grant execute on function public.claim_daily_bonus(boolean) to authenticated;
