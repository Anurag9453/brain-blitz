import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Level, DEFAULT_LEVELS } from "../engine/levels";
import { generateSet, poolFor } from "../engine";
import { poolForAll } from "../engine/generators";
import type { Question } from "../engine/options";
import type { Subject } from "../engine";
import * as api from "../lib/api";
import { setSfxEnabled } from "../lib/sfx";
import { PP_PER_TIER, PASS_TIERS } from "../lib/pass";

const NAMED_KEY = "bb.named";
const THEME_KEY = "bb.theme";
type ThemeMode = "dark" | "light";

type Screen =
  | "loading" | "onboarding" | "home" | "howto" | "modes" | "store"
  | "friends" | "lobby" | "match" | "result" | "friendsResult" | "review" | "league" | "locker" | "pass";

export interface ReviewItem {
  q: string;
  tag: string;
  unit: string;
  chosen: string | null; // what the player tapped (null = skipped / ran out of time)
  correct: string;
  ok: boolean;
}
type Mode = "arena" | "cpu" | "friends" | "marathon" | "practice";
export type SubjectSel = Subject | "mixed";

const ALL_SUBJECTS: Subject[] = ["maths", "physics", "chemistry"];
const resolveSubjects = (s: SubjectSel): Subject[] => (s === "mixed" ? ALL_SUBJECTS : [s]);

interface Common {
  level: Level;
  correct: number;
  wrong: number;
  attempted: number;
}
export type MatchResult =
  | ({ kind: "arena" } & api.FinishResult & Common)
  | ({ kind: "duel" } & api.DuelResult & Common)
  | ({ kind: "marathon"; score: number } & Common)
  | ({ kind: "practice"; score: number } & Common);

interface GameState {
  screen: Screen;
  error: string | null;
  coins: number;
  username: string;
  xp: number;
  winStreak: number;
  bestWinStreak: number;
  leagueTier: number;
  leaguePoints: number;
  league: api.LeagueState | null;
  seasonResult: api.SeasonResult | null;
  skin: string;
  ownedSkins: string[];
  pass: api.SeasonPass | null;
  levels: Level[];
  progress: Record<number, { stars: number; score: number }>;
  selLevel: number;
  activeLevel: Level | null;
  activeMode: Mode;
  activeDurationMs: number;
  opponentTarget: number;
  activeQuestions: Question[];
  activeSubjects: Subject[];
  subject: SubjectSel;
  duelSeconds: number; // chosen length for vs Computer
  friendsSeconds: number; // chosen length for Play with Friends (independent of vs Computer)
  matchId: string | null;
  result: MatchResult | null;
  soundOn: boolean;
  theme: ThemeMode;
  dailyAvailable: boolean;
  dailyStreak: number;
  // Play with Friends
  roomId: string | null;
  room: api.RoomState | null;
  // post-match answer review
  lastReview: ReviewItem[];
  reviewReturn: Screen;

  init: () => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  openHowTo: () => void;
  selectLevel: (n: number) => void;
  setSubject: (s: SubjectSel) => void;
  setDuelSeconds: (s: number) => void;
  setFriendsSeconds: (s: number) => void;
  goModes: () => void;
  beginMatch: () => Promise<void>;
  beginDuel: (mode: api.DuelMode) => Promise<void>;
  beginMarathon: () => void;
  beginPractice: () => void;
  endMarathon: (correct: number, wrong: number, attempted: number, review: ReviewItem[]) => void;
  endPractice: (correct: number, wrong: number, attempted: number, review: ReviewItem[]) => void;
  endMatch: (correct: number, wrong: number, attempted: number, review: ReviewItem[]) => Promise<void>;
  endDuel: (correct: number, wrong: number, attempted: number, review: ReviewItem[]) => Promise<void>;
  openReview: () => void;
  closeReview: () => void;
  goHome: () => void;
  playLevel: (n: number) => Promise<void>;
  toggleSound: () => void;
  toggleTheme: () => void;
  openLeague: () => void;
  loadLeague: () => Promise<void>;
  clearSeasonResult: () => void;
  openLocker: () => void;
  unlockSkin: (id: string) => Promise<string | null>;
  equipSkin: (id: string) => void;
  equipDefault: (mode: "dark" | "light") => void;
  openPass: () => void;
  loadPass: () => Promise<void>;
  buyPass: () => Promise<string | null>;
  claimPass: (tier: number, premium: boolean) => Promise<api.PassClaimResult | null>;
  claimDaily: (correct: boolean) => Promise<api.DailyResult>;
  openStore: () => void;
  closeStore: () => void;
  claimAd: () => Promise<api.AdReward>;
  // friends
  openFriends: () => void;
  hostRoom: () => Promise<void>;
  joinRoomByCode: (code: string) => Promise<void>;
  refreshRoom: () => Promise<void>;
  startRoomGame: () => Promise<void>;
  beginFriendsMatch: () => void;
  endFriends: (correct: number, wrong: number, attempted: number, review: ReviewItem[], forfeit?: boolean) => Promise<void>;
  voteRematch: () => Promise<void>;
  leaveRoom: () => void;
}

// Free modes finish on the client; grant XP (correct × 10) optimistically and
// reconcile with the server's authoritative total.
function awardFreeXp(
  correct: number,
  set: (partial: Partial<GameState>) => void,
  get: () => GameState
) {
  const gain = correct * 10;
  if (gain <= 0) return;
  set({ xp: get().xp + gain });
  api.addXp(gain).then((r) => set({ xp: r.xp })).catch(() => {});
}

// Competitive matches feed the weekly league. LP = the (non-negative) match
// score; reconcile the Home chip with the server's authoritative total.
function awardLeaguePoints(
  score: number,
  set: (partial: Partial<GameState>) => void,
  get: () => GameState
) {
  const gain = Math.max(0, score);
  if (gain <= 0) return;
  set({ leaguePoints: get().leaguePoints + gain });
  api.addLeaguePoints(gain).then((total) => set({ leaguePoints: total })).catch(() => {});
}

// Every match (any mode) feeds the season pass. PP = correct answers; reconcile
// the optimistic tier/points with the server's authoritative total.
function awardPassPoints(
  correct: number,
  set: (partial: Partial<GameState>) => void,
  get: () => GameState
) {
  if (correct <= 0) return;
  const p = get().pass;
  if (p) {
    const points = p.points + correct;
    set({ pass: { ...p, points, tier: Math.min(PASS_TIERS, Math.floor(points / PP_PER_TIER)) } });
  }
  api.addPassPoints(correct).then((r) => {
    const cur = get().pass;
    if (cur) set({ pass: { ...cur, points: r.points, tier: r.tier } });
  }).catch(() => {});
}

function highestUnlocked(progress: Record<number, { stars: number }>, count: number): number {
  let top = 1;
  for (let n = 1; n < count; n++) {
    if ((progress[n]?.stars ?? 0) >= 1) top = n + 1;
  }
  return top;
}

export const useGame = create<GameState>((set, get) => ({
  screen: "loading",
  error: null,
  coins: 0,
  username: "",
  xp: 0,
  winStreak: 0,
  bestWinStreak: 0,
  leagueTier: 1,
  leaguePoints: 0,
  league: null,
  seasonResult: null,
  skin: "default",
  ownedSkins: [],
  pass: null,
  levels: DEFAULT_LEVELS,
  progress: {},
  selLevel: 1,
  activeLevel: null,
  activeMode: "arena",
  activeDurationMs: 120000,
  opponentTarget: 0,
  activeQuestions: [],
  activeSubjects: ALL_SUBJECTS,
  subject: "mixed",
  duelSeconds: 120,
  friendsSeconds: 120,
  matchId: null,
  result: null,
  soundOn: true,
  theme: "dark",
  dailyAvailable: false,
  dailyStreak: 0,
  roomId: null,
  room: null,
  lastReview: [],
  reviewReturn: "result",

  init: async () => {
    try {
      await api.ensureSession();
      // Coins come from ensure_profile (authoritative; self-heals a missing row).
      const profile = await api.ensureProfile();

      // Levels + progress are best-effort: a failure here must not zero coins.
      let lv = DEFAULT_LEVELS;
      const progress: Record<number, { stars: number; score: number }> = {};
      try {
        const levels = await api.fetchLevels();
        if (levels.length) lv = levels;
      } catch {}
      try {
        const progressRows = await api.fetchProgress();
        for (const r of progressRows) progress[r.level] = { stars: r.best_stars, score: r.best_score };
      } catch {}

      const named = (await AsyncStorage.getItem(NAMED_KEY)) === "1";
      const savedTheme = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
      set({
        levels: lv,
        coins: profile.coins,
        username: profile.username,
        xp: profile.xp ?? 0,
        winStreak: profile.win_streak ?? 0,
        bestWinStreak: profile.best_win_streak ?? 0,
        leagueTier: profile.league_tier ?? 1,
        leaguePoints: profile.league_points ?? 0,
        skin: profile.skin ?? "default",
        ownedSkins: profile.owned_skins ?? [],
        progress,
        selLevel: highestUnlocked(progress, lv.length),
        screen: named ? "home" : "onboarding",
        error: null,
        theme: savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark",
        dailyAvailable: profile.daily_available,
        dailyStreak: profile.daily_streak,
      });
      // Settle any finished league week + surface a promotion/relegation result.
      get().loadLeague();
      get().loadPass();
    } catch (e: any) {
      set({ screen: "home", error: e?.message ?? "Could not connect. Check your Supabase setup." });
    }
  },

  setUsername: async (name) => {
    const clean = name.trim().slice(0, 16) || "Player";
    try {
      await api.setUsername(clean);
    } catch {}
    await AsyncStorage.setItem(NAMED_KEY, "1");
    set({ username: clean, screen: "home" });
  },

  openHowTo: () => set({ screen: "howto" }),

  selectLevel: (n) => set({ selLevel: n }),

  setSubject: (s) => set({ subject: s }),

  setDuelSeconds: (s) => set({ duelSeconds: s }),

  setFriendsSeconds: (s) => set({ friendsSeconds: s }),

  goModes: () => set({ screen: "modes", error: null }),

  beginMatch: async () => {
    const { selLevel, levels, subject } = get();
    const level = levels[selLevel - 1];
    try {
      const { match_id, coins } = await api.startMatch(level.n);
      set({
        matchId: match_id, coins, activeLevel: level, activeMode: "arena",
        activeSubjects: resolveSubjects(subject),
        activeDurationMs: level.time * 1000, screen: "match", error: null,
      });
    } catch (e: any) {
      const msg = e?.message?.includes("INSUFFICIENT")
        ? `Not enough coins — Level ${level.n} needs ${level.fee} ₵.`
        : e?.message ?? "Could not start match.";
      set({ error: msg });
    }
  },

  beginDuel: async (mode) => {
    const { selLevel, levels, subject, duelSeconds } = get();
    const level = levels[selLevel - 1];
    try {
      const { match_id, coins, opponent_target } = await api.startDuel(level.n, mode, duelSeconds);
      set({
        matchId: match_id, coins, activeLevel: level, activeMode: mode,
        activeSubjects: resolveSubjects(subject),
        activeDurationMs: duelSeconds * 1000, opponentTarget: opponent_target, screen: "match", error: null,
      });
    } catch (e: any) {
      const msg = e?.message?.includes("INSUFFICIENT")
        ? `Not enough coins — this duel costs ${level.fee} ₵.`
        : e?.message ?? "Could not start duel.";
      set({ error: msg });
    }
  },

  endMatch: async (correct, wrong, attempted, review) => {
    const { matchId, activeLevel } = get();
    if (!matchId || !activeLevel) return;
    try {
      const res = await api.finishMatch(matchId, correct, wrong, attempted);
      awardLeaguePoints(res.score, set, get);
      awardPassPoints(correct, set, get);
      set((s) => ({
        coins: res.coins,
        xp: res.xp,
        winStreak: res.win_streak,
        bestWinStreak: Math.max(s.bestWinStreak, res.win_streak),
        lastReview: review,
        result: { kind: "arena", ...res, level: activeLevel, correct, wrong, attempted },
        progress: {
          ...s.progress,
          [activeLevel.n]: {
            stars: Math.max(s.progress[activeLevel.n]?.stars ?? 0, res.stars),
            score: Math.max(s.progress[activeLevel.n]?.score ?? 0, res.score),
          },
        },
        matchId: null,
        screen: "result",
      }));
    } catch (e: any) {
      set({ error: e?.message ?? "Could not submit result.", screen: "home", matchId: null });
    }
  },

  endDuel: async (correct, wrong, attempted, review) => {
    const { matchId, activeLevel } = get();
    if (!matchId || !activeLevel) return;
    try {
      const res = await api.finishDuel(matchId, correct, wrong, attempted);
      awardLeaguePoints(res.player_score, set, get);
      awardPassPoints(correct, set, get);
      set((s) => ({
        coins: res.coins,
        xp: res.xp,
        winStreak: res.win_streak,
        bestWinStreak: Math.max(s.bestWinStreak, res.win_streak),
        lastReview: review,
        result: { kind: "duel", ...res, level: activeLevel, correct, wrong, attempted },
        matchId: null,
        screen: "result",
      }));
    } catch (e: any) {
      set({ error: e?.message ?? "Could not submit result.", screen: "home", matchId: null });
    }
  },

  goHome: () => set({ screen: "home", result: null }),

  playLevel: async (n) => {
    set({ selLevel: n });
    await get().beginMatch();
  },

  toggleSound: () => {
    const next = !get().soundOn;
    setSfxEnabled(next);
    set({ soundOn: next });
  },

  toggleTheme: () => {
    // The quick toggle always returns to the default skin so it has a visible effect.
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    set({ theme: next, skin: "default" });
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
    api.equipSkin("default").catch(() => {});
  },

  openLocker: () => set({ screen: "locker" }),

  equipSkin: (id) => {
    set({ skin: id });
    api.equipSkin(id).catch(() => {});
  },

  equipDefault: (mode) => {
    set({ skin: "default", theme: mode });
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
    api.equipSkin("default").catch(() => {});
  },

  unlockSkin: async (id) => {
    try {
      const res = await api.unlockSkin(id);
      set({ coins: res.coins, ownedSkins: res.owned_skins, skin: id });
      api.equipSkin(id).catch(() => {});
      return null;
    } catch (e: any) {
      const m = e?.message ?? "";
      if (m.includes("INSUFFICIENT")) return "INSUFFICIENT_COINS";
      if (m.includes("TIER_LOCKED")) return "TIER_LOCKED";
      return "ERROR";
    }
  },

  openPass: () => {
    set({ screen: "pass" });
    get().loadPass();
  },

  loadPass: async () => {
    try {
      const pass = await api.getSeasonPass();
      set({ pass });
    } catch {}
  },

  buyPass: async () => {
    try {
      const res = await api.buySeasonPass();
      const cur = get().pass;
      set({ coins: res.coins, pass: cur ? { ...cur, premium: true } : cur });
      return null;
    } catch (e: any) {
      return (e?.message ?? "").includes("INSUFFICIENT") ? "INSUFFICIENT_COINS" : "ERROR";
    }
  },

  claimPass: async (tier, premium) => {
    try {
      const res = await api.claimPassReward(tier, premium);
      const cur = get().pass;
      set({
        coins: res.coins,
        ownedSkins: res.owned_skins,
        pass: cur ? { ...cur, free_claimed: res.free_claimed, prem_claimed: res.prem_claimed } : cur,
      });
      return res;
    } catch {
      return null;
    }
  },

  openLeague: () => {
    set({ screen: "league" });
    get().loadLeague();
  },

  loadLeague: async () => {
    try {
      const league = await api.getLeague();
      set({
        league,
        leagueTier: league.tier,
        leaguePoints: league.points,
        seasonResult: league.season_result ?? get().seasonResult,
      });
    } catch {}
  },

  clearSeasonResult: () => set({ seasonResult: null }),

  claimDaily: async (correct) => {
    const res = await api.claimDaily(correct);
    // Both a correct claim and a wrong answer spend today's attempt; only a
    // duplicate (ALREADY_CLAIMED) leaves coins/streak untouched.
    set({
      coins: res.coins ?? get().coins,
      dailyAvailable: false,
      dailyStreak: res.streak ?? get().dailyStreak,
    });
    return res;
  },

  // ---------- Play with Friends ----------
  openFriends: () => set({ screen: "friends", error: null, room: null, roomId: null }),

  hostRoom: async () => {
    try {
      const { room_id } = await api.createRoom(get().selLevel, get().subject, get().friendsSeconds);
      set({ roomId: room_id, screen: "lobby", error: null });
      await get().refreshRoom();
    } catch (e: any) {
      set({ error: e?.message ?? "Could not create room." });
    }
  },

  joinRoomByCode: async (code) => {
    try {
      const { room_id } = await api.joinRoom(code.trim().toUpperCase());
      set({ roomId: room_id, screen: "lobby", error: null });
      await get().refreshRoom();
    } catch (e: any) {
      const m = e?.message ?? "";
      const msg = m.includes("ROOM_NOT_FOUND")
        ? "No room with that code."
        : m.includes("ROOM_FULL")
        ? "That room is full."
        : m.includes("ROOM_STARTED")
        ? "That game already started."
        : "Could not join room.";
      set({ error: msg });
    }
  },

  refreshRoom: async () => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const room = await api.getRoom(roomId);
      set({ room });
    } catch {}
  },

  startRoomGame: async () => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      await api.startRoom(roomId);
      await get().refreshRoom();
    } catch (e: any) {
      const m = e?.message ?? "";
      const msg = m.includes("NEED_PLAYERS")
        ? "Need at least 2 players to start."
        : m.includes("SOMEONE_BROKE")
        ? "Everyone needs 100 ₵ to start."
        : "Could not start the game.";
      set({ error: msg });
    }
  },

  beginFriendsMatch: () => {
    const { room, levels } = get();
    if (!room) return;
    const level = levels[room.level - 1] ?? DEFAULT_LEVELS[room.level - 1];
    const subs = resolveSubjects((room.subject as SubjectSel) ?? "mixed");
    const secs = room.duration_seconds ?? 120;
    const questions = generateSet(poolFor(level.cls, subs), Math.max(120, Math.ceil(secs / 1.2)), room.seed);
    set({
      activeMode: "friends",
      activeLevel: level,
      activeDurationMs: secs * 1000,
      activeQuestions: questions,
      activeSubjects: subs,
      screen: "match",
      error: null,
    });
  },

  endFriends: async (correct, wrong, attempted, review, forfeit = false) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      await api.submitRoomScore(roomId, correct, wrong, attempted, forfeit);
    } catch {}
    awardPassPoints(correct, set, get);
    set({ lastReview: review, screen: "friendsResult" });
    await get().refreshRoom();
  },

  openReview: () => set((s) => ({ reviewReturn: s.screen, screen: "review" })),
  closeReview: () => set((s) => ({ screen: s.reviewReturn })),

  openStore: () => set({ screen: "store", error: null }),
  closeStore: () => set({ screen: "home" }),
  claimAd: async () => {
    const res = await api.claimAdReward();
    if (res.ok && res.coins != null) set({ coins: res.coins });
    return res;
  },

  // Marathon: free 10-minute practice run (client-only, no coins).
  beginMarathon: () => {
    const { selLevel, levels, subject } = get();
    const level = levels[selLevel - 1];
    set({
      activeMode: "marathon",
      activeLevel: level,
      activeSubjects: resolveSubjects(subject),
      activeDurationMs: 600000,
      activeQuestions: [],
      screen: "match",
      error: null,
    });
  },

  endMarathon: (correct, wrong, attempted, review) => {
    const { activeLevel } = get();
    if (!activeLevel) return;
    awardFreeXp(correct, set, get);
    awardPassPoints(correct, set, get);
    set({
      lastReview: review,
      result: { kind: "marathon", score: correct * 3 - wrong, level: activeLevel, correct, wrong, attempted },
      screen: "result",
    });
  },

  // Practice: free 1-minute warm-up at the selected level (client-only, no coins).
  beginPractice: () => {
    const { selLevel, levels, subject } = get();
    const level = levels[selLevel - 1];
    set({
      activeMode: "practice",
      activeLevel: level,
      activeSubjects: resolveSubjects(subject),
      activeDurationMs: 60000,
      activeQuestions: [],
      screen: "match",
      error: null,
    });
  },

  endPractice: (correct, wrong, attempted, review) => {
    const { activeLevel } = get();
    if (!activeLevel) return;
    awardFreeXp(correct, set, get);
    awardPassPoints(correct, set, get);
    set({
      lastReview: review,
      result: { kind: "practice", score: correct * 3 - wrong, level: activeLevel, correct, wrong, attempted },
      screen: "result",
    });
  },

  voteRematch: async () => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      await api.voteRematch(roomId);
    } catch (e: any) {
      set({ error: e?.message?.includes("SOMEONE_BROKE") ? "Someone can't afford the rematch." : null });
    }
    await get().refreshRoom();
  },

  leaveRoom: () => {
    const { roomId } = get();
    if (roomId) api.leaveRoomApi(roomId).catch(() => {});
    set({ screen: "home", room: null, roomId: null, error: null });
    api.ensureProfile().then((p) => set({ coins: p.coins })).catch(() => {});
  },
}));
