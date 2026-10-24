// Thin data layer over Supabase. The economy (start/finish) goes through RPCs
// so the server stays authoritative; reads use RLS-protected tables.

import { supabase } from "./supabase";
import { Level } from "../engine/levels";

export interface Profile {
  id: string;
  username: string;
  coins: number;
  xp: number;
  win_streak: number;
  best_win_streak: number;
  league_tier: number;
  league_points: number;
  owned_skins: string[];
  skin: string;
  daily_streak: number;
  daily_available: boolean;
}

export interface ProgressRow {
  level: number;
  best_stars: number;
  best_score: number;
}

export interface BoardRow {
  rank: number;
  name: string;
  score: number;
  you: boolean;
}

export interface FinishResult {
  score: number;
  stars: number;
  rank: number;
  total: number;
  prize: number;
  streak_bonus: number;
  multiplier: number;
  win_streak: number;
  xp: number;
  xp_gain: number;
  coins: number;
  unlocked_next: boolean;
  board: BoardRow[];
}

export interface DailyResult {
  claimed: boolean;
  reason?: string;
  amount?: number;
  streak?: number;
  coins?: number;
}

export type DuelMode = "cpu";

export interface DuelResult {
  player_score: number;
  opponent_score: number;
  outcome: "win" | "draw" | "lose";
  prize: number;
  streak_bonus: number;
  multiplier: number;
  win_streak: number;
  xp: number;
  xp_gain: number;
  coins: number;
}

export interface XpResult {
  xp: number;
  xp_gain: number;
}

export interface LeagueRow {
  rank: number;
  name: string;
  lp: number;
  you: boolean;
}

export interface SeasonResult {
  outcome: "promoted" | "relegated" | "stayed";
  from_tier: number;
  to_tier: number;
  rank: number;
  points: number;
}

export interface LeagueState {
  tier: number;
  points: number;
  rank: number;
  pod: number;
  promote_cut: number;
  relegate_cut: number;
  week_ends: string;
  board: LeagueRow[];
  season_result: SeasonResult | null;
}

/** Ensure we have a session; sign in anonymously the first time. */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export async function fetchLevels(): Promise<Level[]> {
  const { data, error } = await supabase.from("levels").select("*").order("n");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    n: r.n,
    name: r.name,
    band: r.band,
    cls: r.cls,
    time: r.time_seconds,
    stars: [r.star1, r.star2, r.star3] as [number, number, number],
    fee: r.fee,
    payout: r.payout as [number, number, number],
  }));
}

export async function fetchProfile(): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, coins")
    .single();
  if (error) throw error;
  return data as Profile;
}

/** Create the profile (with starter coins) if missing, then return it. */
export async function ensureProfile(): Promise<Profile> {
  const { data, error } = await supabase.rpc("ensure_profile");
  if (error) throw error;
  return data as Profile;
}

/** Set the player's display name on their profile. */
export async function setUsername(name: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { error } = await supabase.from("profiles").update({ username: name }).eq("id", uid);
  if (error) throw error;
}

export interface AdReward {
  ok: boolean;
  reason?: string;
  amount?: number;
  coins?: number;
  remaining?: number;
}

/** Grant a rewarded-ad coin bonus (server-capped per day). */
export async function claimAdReward(): Promise<AdReward> {
  const { data, error } = await supabase.rpc("claim_ad_reward");
  if (error) throw error;
  return data as AdReward;
}

/** Claim today's login bonus (server enforces once-per-day + streak). */
export async function claimDaily(correct: boolean): Promise<DailyResult> {
  const { data, error } = await supabase.rpc("claim_daily_bonus", { p_correct: correct });
  if (error) throw error;
  return data as DailyResult;
}

/** Award XP for the free modes (Marathon/Practice), which finish client-side. */
export async function addXp(amount: number): Promise<XpResult> {
  const { data, error } = await supabase.rpc("add_xp", { p_amount: amount });
  if (error) throw error;
  return data as XpResult;
}

export async function getLeague(): Promise<LeagueState> {
  const { data, error } = await supabase.rpc("get_league");
  if (error) throw error;
  return data as LeagueState;
}

/** Add weekly League Points after a competitive match (Arena / vs Computer). */
export async function addLeaguePoints(points: number): Promise<number> {
  const { data, error } = await supabase.rpc("add_league_points", { p_points: points });
  if (error) throw error;
  return (data as { points: number }).points;
}

export interface SeasonPass {
  season: number;
  points: number;
  tier: number;
  premium: boolean;
  pp_per_tier: number;
  tiers: number;
  price: number;
  season_ends: string;
  free_claimed: number[];
  prem_claimed: number[];
}

export interface PassClaimResult {
  coins: number;
  owned_skins: string[];
  free_claimed: number[];
  prem_claimed: number[];
  reward_type: "coins" | "skin";
  reward_amount: number;
  reward_skin: string | null;
}

export async function getSeasonPass(): Promise<SeasonPass> {
  const { data, error } = await supabase.rpc("get_season_pass");
  if (error) throw error;
  return data as SeasonPass;
}

export async function addPassPoints(points: number): Promise<{ points: number; tier: number }> {
  const { data, error } = await supabase.rpc("add_pass_points", { p_points: points });
  if (error) throw error;
  return data as { points: number; tier: number };
}

export async function buySeasonPass(): Promise<{ coins: number; premium: boolean }> {
  const { data, error } = await supabase.rpc("buy_season_pass");
  if (error) throw error;
  return data as { coins: number; premium: boolean };
}

export async function claimPassReward(tier: number, premium: boolean): Promise<PassClaimResult> {
  const { data, error } = await supabase.rpc("claim_pass_reward", { p_tier: tier, p_premium: premium });
  if (error) throw error;
  return data as PassClaimResult;
}

export async function unlockSkin(id: string): Promise<{ coins: number; owned_skins: string[] }> {
  const { data, error } = await supabase.rpc("unlock_skin", { p_id: id });
  if (error) throw error;
  return data as { coins: number; owned_skins: string[] };
}

export async function equipSkin(id: string): Promise<void> {
  const { error } = await supabase.rpc("equip_skin", { p_id: id });
  if (error) throw error;
}

export async function fetchProgress(): Promise<ProgressRow[]> {
  const { data, error } = await supabase
    .from("level_progress")
    .select("level, best_stars, best_score");
  if (error) throw error;
  return (data ?? []) as ProgressRow[];
}

export async function startMatch(
  level: number
): Promise<{ match_id: string; coins: number }> {
  const { data, error } = await supabase.rpc("start_match", { p_level: level });
  if (error) throw error;
  return data as { match_id: string; coins: number };
}

export async function finishMatch(
  matchId: string,
  correct: number,
  wrong: number,
  attempted: number
): Promise<FinishResult> {
  const { data, error } = await supabase.rpc("finish_match", {
    p_match_id: matchId,
    p_correct: correct,
    p_wrong: wrong,
    p_attempted: attempted,
  });
  if (error) throw error;
  return data as FinishResult;
}

export async function startDuel(
  level: number,
  mode: DuelMode,
  seconds: number
): Promise<{ match_id: string; coins: number; opponent_target: number }> {
  const { data, error } = await supabase.rpc("start_duel", { p_level: level, p_mode: mode, p_seconds: seconds });
  if (error) throw error;
  return data as { match_id: string; coins: number; opponent_target: number };
}

export async function finishDuel(
  matchId: string,
  correct: number,
  wrong: number,
  attempted: number
): Promise<DuelResult> {
  const { data, error } = await supabase.rpc("finish_duel", {
    p_match_id: matchId,
    p_correct: correct,
    p_wrong: wrong,
    p_attempted: attempted,
  });
  if (error) throw error;
  return data as DuelResult;
}

/* ---------------- Play with Friends (rooms) ---------------- */

export interface RoomPlayer {
  user_id: string;
  username: string;
  score: number | null;
  finished: boolean;
  place: number | null;
}

export interface RoomState {
  id: string;
  code: string;
  level: number;
  status: "lobby" | "playing" | "done";
  seed: number;
  fee: number;
  pot: number;
  rake: number;
  winner: string | null;
  host: string;
  is_host: boolean;
  you: string;
  subject: string;
  duration_seconds: number;
  players: RoomPlayer[];
}

export async function createRoom(level: number, subject: string, seconds: number): Promise<{ room_id: string; code: string }> {
  const { data, error } = await supabase.rpc("create_room", { p_level: level, p_subject: subject, p_seconds: seconds });
  if (error) throw error;
  return data as { room_id: string; code: string };
}

export async function joinRoom(code: string): Promise<{ room_id: string }> {
  const { data, error } = await supabase.rpc("join_room", { p_code: code });
  if (error) throw error;
  return data as { room_id: string };
}

export async function startRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("start_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function submitRoomScore(
  roomId: string,
  correct: number,
  wrong: number,
  attempted: number,
  forfeit = false
): Promise<void> {
  const { error } = await supabase.rpc("submit_room_score", {
    p_room_id: roomId,
    p_correct: correct,
    p_wrong: wrong,
    p_attempted: attempted,
    p_forfeit: forfeit,
  });
  if (error) throw error;
}

export async function voteRematch(roomId: string): Promise<{ restarted: boolean }> {
  const { data, error } = await supabase.rpc("vote_rematch", { p_room_id: roomId });
  if (error) throw error;
  return data as { restarted: boolean };
}

export async function leaveRoomApi(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function finalizeRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("finalize_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function getRoom(roomId: string): Promise<RoomState> {
  const { data, error } = await supabase.rpc("get_room", { p_room_id: roomId });
  if (error) throw error;
  return data as RoomState;
}

export async function fetchLeaderboard(
  level: number
): Promise<{ username: string; best: number }[]> {
  const { data, error } = await supabase.rpc("get_daily_leaderboard", {
    p_level: level,
  });
  if (error) throw error;
  return (data ?? []) as { username: string; best: number }[];
}
