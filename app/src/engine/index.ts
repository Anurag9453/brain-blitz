import { pick, setSeed, clearSeed } from "./rng";
import { Gen } from "./generators";
import { buildQuestion, Question } from "./options";

/** Pull the next question from a level's generator pool. */
export function nextQuestion(pool: Gen[]): Question {
  const e = pick(pool);
  return buildQuestion(e.g(), e.ch);
}

/**
 * Deterministically generate `count` questions from a seed. Same (pool, seed)
 * → identical set on every device. Used by Play-with-Friends so all players
 * answer the exact same questions in the same order.
 */
export function generateSet(pool: Gen[], count: number, seed: number): Question[] {
  setSeed(seed);
  const out: Question[] = [];
  for (let i = 0; i < count; i++) out.push(nextQuestion(pool));
  clearSeed();
  return out;
}

export * from "./rng";
export * from "./options";
export * from "./generators";
export * from "./levels";
