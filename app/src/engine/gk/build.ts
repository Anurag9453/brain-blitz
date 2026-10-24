// Turns the GK data (hand-written MCQs + fact tables) into engine generators.
//
// Every question becomes a small "spec". Specs are bucketed by (category,
// class band) and each bucket is ONE generator, so GK doesn't swamp other
// subjects by sheer count, and all randomness still flows through rng.ts —
// friends' rooms stay deterministic for a given seed.

import { pick, shuffle, rnd, random } from "../rng";
import type { RawItem } from "../options";
import type { Gen } from "../generators";
import type { Cls, FactTable, GkCat, GkData } from "./types";

export const GK_LABEL: Record<GkCat, string> = {
  history: "History",
  geography: "Geography",
  polity: "Polity & Constitution",
  scitech: "Science & Tech",
  world: "World & Geopolitics",
  culture: "Art & Culture",
  economy: "Economy",
  sports: "Sports & Awards",
};

// Nearby-year wrong options never go past this.
const MAX_YEAR = 2026;

export interface Spec {
  cat: GkCat;
  cls: Cls;
  tag: string;
  /** Identity of the question (text + answer), for cross-category de-duplication. */
  key: string;
  make: () => RawItem;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Same question + same answer in two places is one question. */
export const qkey = (q: string, a: string): string => norm(q) + " => " + norm(a);

export const fill = (tpl: string, vals: string[]): string =>
  tpl.replace(/\{(\d+)\}/g, (_, i) => vals[+i]);

/** Up to 3 wrong options from `pool`, never one that's also a right answer. */
function wrongFrom(pool: string[], bad: Set<string>): string[] {
  const out: string[] = [];
  for (const v of shuffle(pool)) {
    if (!bad.has(v)) out.push(v);
    if (out.length === 3) break;
  }
  return out;
}

/** 3 plausible years close to `y` (so the answer isn't guessable by era). */
function nearYears(y: number, bad: Set<string>): string[] {
  const s = new Set<string>();
  let guard = 0;
  while (s.size < 3 && guard++ < 200) {
    const v = y + rnd(1, 12) * (random() < 0.5 ? -1 : 1);
    if (v <= MAX_YEAR && !bad.has(String(v))) s.add(String(v));
  }
  return [...s];
}

export function tableSpecs(cat: GkCat, t: FactTable): Spec[] {
  const rows = t.rows.map((r) => ({ vals: r.slice(0, -1).map(String), cls: r[r.length - 1] as Cls }));
  const out: Spec[] = [];
  for (const ask of t.asks) {
    const isYear = !!t.years?.includes(ask.to);
    // Rows that render the SAME question share their answers — none of those
    // may appear as a wrong option (e.g. two national parks in one state).
    const right = new Map<string, Set<string>>();
    for (const r of rows) {
      const k = fill(ask.q[0], r.vals);
      if (!right.has(k)) right.set(k, new Set());
      right.get(k)!.add(r.vals[ask.to]);
    }
    const pool = [...new Set([...rows.map((r) => r.vals[ask.to]), ...(t.extra?.[ask.to] ?? [])])];
    for (const r of rows) {
      const a = r.vals[ask.to];
      const bad = right.get(fill(ask.q[0], r.vals))!;
      out.push({
        cat,
        cls: r.cls,
        tag: t.topic,
        key: qkey(fill(ask.q[0], r.vals), a),
        make: () => ({
          q: fill(pick(ask.q), r.vals),
          a,
          options: shuffle([a, ...(isYear ? nearYears(+a, bad) : wrongFrom(pool, bad))]),
          tag: t.topic,
        }),
      });
    }
  }
  return out;
}

export function mcqSpecs(d: GkData): Spec[] {
  const out: Spec[] = [];
  for (const [tag, list] of Object.entries(d.mcq)) {
    for (const [q, a, w1, w2, w3, cls] of list) {
      out.push({ cat: d.cat, cls, tag, key: qkey(q, a), make: () => ({ q, a, options: shuffle([a, w1, w2, w3]), tag }) });
    }
  }
  return out;
}

/** Every question once: when two categories hold the same one, the first (in data order) wins. */
export function allSpecs(data: GkData[]): Spec[] {
  const seen = new Set<string>();
  return data
    .flatMap((d) => [...mcqSpecs(d), ...d.tables.flatMap((t) => tableSpecs(d.cat, t))])
    .filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)));
}

/** One generator per (category, class band) bucket. */
export function buildGkGens(data: GkData[]): Gen[] {
  const buckets = new Map<string, Spec[]>();
  for (const s of allSpecs(data)) {
    const k = `${s.cat}|${s.cls}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(s);
  }
  return [...buckets.entries()].map(([k, specs]): Gen => {
    const [cat, cls] = k.split("|");
    return { cls: +cls, ch: GK_LABEL[cat as GkCat], subject: "gk", g: () => pick(specs).make() };
  });
}
