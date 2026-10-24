// Helpers for procedural question generation.
//
// All randomness flows through a single swappable source `_rand`. By default
// it's Math.random (single-player). Call setSeed(n) to switch to a deterministic
// PRNG so every device with the same seed generates the IDENTICAL question set
// (used by Play-with-Friends). Always clearSeed() afterwards.

let _rand: () => number = Math.random;

export function setSeed(seed: number): void {
  let a = seed >>> 0;
  _rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clearSeed(): void {
  _rand = Math.random;
}

/** Current random source in [0,1). Use this instead of Math.random in the engine. */
export const random = (): number => _rand();

export const rnd = (lo: number, hi: number) =>
  Math.floor(_rand() * (hi - lo + 1)) + lo;

export const pick = <T>(a: T[]): T => a[Math.floor(_rand() * a.length)];

export function shuffle<T>(a: T[]): T[] {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(_rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

export function decimals(n: number | string): number {
  const s = String(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

export function simp(n: number, d: number): [number, number] {
  const g = gcd(n, d);
  return [n / g, d / g];
}

export function fracStr(n: number, d: number): string {
  const [a, b] = simp(n, d);
  return b === 1 ? String(a) : `${a}/${b}`;
}

export function ratioStr(a: number, b: number): string {
  const g = gcd(a, b);
  return `${a / g} : ${b / g}`;
}
