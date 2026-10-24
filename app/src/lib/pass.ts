// Season-pass constants + reward formulas. These MUST mirror the server
// (supabase/migrations/0018_season_pass.sql claim_pass_reward / get_season_pass).
export const PP_PER_TIER = 100;
export const PASS_TIERS = 10;
export const PASS_PRICE = 15000;

export type PassReward = { type: "coins"; amount: number } | { type: "skin"; id: string };

export function freeReward(tier: number): PassReward {
  return { type: "coins", amount: 100 * tier };
}

export function premReward(tier: number): PassReward {
  if (tier === 3) return { type: "skin", id: "sunset" };
  if (tier === 6) return { type: "skin", id: "ocean" };
  if (tier === 10) return { type: "skin", id: "galaxy" };
  return { type: "coins", amount: 250 * tier };
}
