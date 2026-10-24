// Account level derived from lifetime XP. The curve is triangular: reaching
// level L costs 50·L·(L-1) total XP (L1 at 0, L2 at 100, L3 at 300, L4 at 600…),
// so early levels come fast and later ones slow down.
export interface AccountLevel {
  level: number;
  into: number; // XP earned inside the current level
  span: number; // XP needed to clear the current level
  pct: number; // 0..1 progress to next level
}

const thresholdFor = (level: number) => 50 * level * (level - 1);

export function accountLevel(xp: number): AccountLevel {
  const x = Math.max(0, xp || 0);
  let level = 1;
  while (thresholdFor(level + 1) <= x) level++;
  const floor = thresholdFor(level);
  const next = thresholdFor(level + 1);
  const span = next - floor;
  const into = x - floor;
  return { level, into, span, pct: span ? into / span : 0 };
}
