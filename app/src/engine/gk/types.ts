// Data shapes for the General Knowledge bank (India-focused).
//
// GK is factual, so unlike maths it can't be computed — it's authored data.
// Two forms keep it compact and consistent:
//  • Mcq        — a hand-written question with exactly 3 wrong options.
//  • FactTable  — rows of facts; each `ask` turns every row into a question,
//                 and wrong options come from the same column of OTHER rows.
// Difficulty is a school-class band (6 easiest → 10 hardest), matching levels.

export type GkCat =
  | "history"
  | "geography"
  | "polity"
  | "scitech"
  | "world"
  | "culture"
  | "economy"
  | "sports";

export type Cls = 6 | 7 | 8 | 9 | 10;

/** [question, correct answer, wrong 1, wrong 2, wrong 3, class band] */
export type Mcq = [string, string, string, string, string, Cls];

export interface FactTable {
  /** Chapter tag shown above the question, e.g. "National Parks". */
  topic: string;
  /** Column names — documentation only. */
  cols: string[];
  /** Each row: one value per column, then the class band as the LAST element. */
  rows: (string | number)[][];
  /**
   * Question templates. `to` = the column holding the answer. Each `q` string
   * may reference any other column as {0}, {1}, … ; one is picked at random.
   */
  asks: { to: number; q: string[] }[];
  /** Columns holding years: wrong options become nearby years, not other rows. */
  years?: number[];
  /** Extra wrong-option values for a column (never used as answers). */
  extra?: Record<number, string[]>;
}

export interface GkData {
  cat: GkCat;
  /** Hand-written questions grouped by chapter tag. */
  mcq: Record<string, Mcq[]>;
  tables: FactTable[];
}
