// Builds the 4 multiple-choice options for a question and normalises the
// answer to a comparable string. Mirrors the verified prototype logic.

import { rnd, pick, shuffle, decimals, random } from "./rng";

/** What a generator returns before options are built. */
export interface RawItem {
  q: string;
  a: number | string;
  options?: (string | number)[];
  unit?: string;
  tag?: string; // overrides the generator's chapter (GK buckets mix topics)
}

/** A fully-built question ready to render. */
export interface Question {
  q: string;
  a: string; // correct answer, as a string for exact comparison
  tag: string; // chapter label
  unit: string; // e.g. "°", "%" — appended to each option on display
  options: string[];
}

/** Numeric distractors clustered plausibly around the answer. */
export function makeNumOpts(answer: number): (string | number)[] {
  const dp = decimals(answer);
  const f = Math.pow(10, dp);
  const ans = Math.round(answer * f);
  const set = new Set<number>([ans]);
  const mag = Math.max(1, Math.round(Math.abs(ans) * 0.15));
  let g = 0;
  while (set.size < 4 && g++ < 80) {
    let d: number;
    const r = random();
    if (r < 0.45) d = ans + (random() < 0.5 ? -1 : 1) * rnd(1, Math.max(2, mag));
    else if (r < 0.75) d = ans + (random() < 0.5 ? -1 : 1) * rnd(1, 3);
    else d = Math.round(ans * pick([0.5, 0.9, 1.1, 1.5, 2]));
    if (d !== ans) set.add(d);
  }
  let k = 1;
  while (set.size < 4) {
    if (!set.has(ans + k)) set.add(ans + k);
    k++;
  }
  return shuffle([...set].map((v) => (dp ? (v / f).toFixed(dp) : v)));
}

/** Pick distractors from a fixed bank (fractions, trig values, etc.). */
export function optsFrom(correct: string, bank: string[]): string[] {
  const set = new Set<string>([correct]);
  for (const x of shuffle(bank)) {
    if (set.size >= 4) break;
    set.add(x);
  }
  return shuffle([...set]);
}

/** Use explicit candidate distractors; pad if collisions leave us short. */
export function uniqOpts(correct: string, cands: string[]): string[] {
  const set = new Set<string>([correct]);
  for (const x of cands) {
    if (set.size >= 4) break;
    set.add(x);
  }
  let k = 2;
  while (set.size < 4) {
    set.add(correct + " " + "·".repeat(k));
    k++;
  }
  return shuffle([...set]);
}

export function buildQuestion(item: RawItem, chapter: string): Question {
  let { a } = item;
  let options = item.options;
  if (!options) {
    const dp = decimals(a as number);
    options = makeNumOpts(a as number);
    a = dp ? Number(a).toFixed(dp) : a;
  }
  return {
    q: item.q,
    a: String(a),
    tag: item.tag ?? chapter,
    unit: item.unit || "",
    options: options.map(String),
  };
}
