-- ============================================================================
-- 0022_calibrate_bots.sql: Rebalance bot and CPU difficulty
--
-- Previous settings for cpu_min/cpu_max (90-115) required players to maintain
-- a superhuman pace of 35+ correct answers with 0 errors to beat the computer.
-- This aligns bot scores with human capability for students (Classes 6-10)
-- and matches the star rating curves.
-- ============================================================================

-- Level 1 (Rookie, Classes 6-7, 45s timer):
-- Arena bots: 12 - 38. vs Computer (scaled from 120s baseline 45 - 65):
update public.levels
   set bot_min = 12, bot_max = 38,
       cpu_min = 45, cpu_max = 65
 where n = 1;

-- Level 2 (Sharp, Classes 7-8, 120s timer):
update public.levels
   set bot_min = 24, bot_max = 58,
       cpu_min = 40, cpu_max = 62
 where n = 2;

-- Level 3 (Rapid, Classes 8-9, 150s timer):
update public.levels
   set bot_min = 24, bot_max = 60,
       cpu_min = 36, cpu_max = 58
 where n = 3;

-- Level 4 (Pro, Class 9, 180s timer):
update public.levels
   set bot_min = 22, bot_max = 56,
       cpu_min = 32, cpu_max = 54
 where n = 4;

-- Level 5 (Ace, Classes 9-10, 180s timer):
update public.levels
   set bot_min = 20, bot_max = 52,
       cpu_min = 30, cpu_max = 50
 where n = 5;

-- Level 6 (Elite, Hardest, 210s timer):
update public.levels
   set bot_min = 22, bot_max = 54,
       cpu_min = 28, cpu_max = 48
 where n = 6;
