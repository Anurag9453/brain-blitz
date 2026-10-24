-- Level 1 (Rookie): shorten to a 45-second warm-up, and rebalance its star
-- thresholds + bot scores for the shorter window (fewer questions fit).
update public.levels
   set time_seconds = 45,
       star1 = 12, star2 = 28, star3 = 45,
       bot_min = 10, bot_max = 35
 where n = 1;
