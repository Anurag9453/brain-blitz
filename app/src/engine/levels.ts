// Level metadata used by the client for display + pool selection.
// The DB `levels` table is the source of truth for the ECONOMY (fee/payout/
// stars) — these defaults are a fallback and must stay in sync with seed.sql.

export interface Level {
  n: number;
  name: string;
  band: string;
  cls: number[]; // which class pools feed this level
  time: number; // seconds
  stars: [number, number, number]; // score thresholds for 1★ / 2★ / 3★
  fee: number;
  payout: [number, number, number]; // prizes for ranks 1 / 2 / 3
}

export const DEFAULT_LEVELS: Level[] = [
  { n: 1, name: "Rookie", band: "Classes 6–7", cls: [6, 7], time: 45, stars: [12, 28, 45], fee: 100, payout: [40, 20, 10] },
  { n: 2, name: "Sharp", band: "Classes 7–8", cls: [7, 8], time: 120, stars: [25, 50, 75], fee: 2500, payout: [100, 50, 25] },
  { n: 3, name: "Rapid", band: "Classes 8–9", cls: [8, 9], time: 150, stars: [25, 48, 72], fee: 5000, payout: [160, 80, 40] },
  { n: 4, name: "Pro", band: "Class 9", cls: [9], time: 180, stars: [22, 45, 68], fee: 25000, payout: [240, 120, 60] },
  { n: 5, name: "Ace", band: "Classes 9–10", cls: [9, 10], time: 180, stars: [22, 45, 66], fee: 50000, payout: [360, 180, 90] },
  { n: 6, name: "Elite", band: "All · hardest", cls: [8, 9, 10], time: 210, stars: [24, 48, 72], fee: 100000, payout: [520, 260, 130] },
];

/** Stars earned for a score at a given level. */
export function calcStars(score: number, level: Level): number {
  const [a, b, c] = level.stars;
  return score >= c ? 3 : score >= b ? 2 : score >= a ? 1 : 0;
}

/** A level is unlocked if it's the first, or the previous level has ≥1 star. */
export function isUnlocked(n: number, progress: Record<number, { stars: number }>): boolean {
  if (n <= 1) return true;
  return (progress[n - 1]?.stars ?? 0) >= 1;
}
