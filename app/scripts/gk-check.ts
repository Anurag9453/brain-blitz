// Lints the GK bank and prints question counts.
// Run: npx tsx scripts/gk-check.ts [category]   (exit 1 on any error)
//
// Errors  — must fix: malformed rows, duplicate/conflicting questions, wrong
//           options that are also correct, too few distinct wrong options.
// Warnings — worth a look: long option text (UI fit), answer leaked in question.

import { allSpecs, fill, GK_LABEL, qkey } from "../src/engine/gk/build";
import { buildQuestion } from "../src/engine/options";
import type { GkCat, GkData } from "../src/engine/gk/types";

const only = process.argv[2] as GkCat | undefined;
if (only && !(only in GK_LABEL)) {
  console.error(`Unknown category '${only}'. Use one of: ${Object.keys(GK_LABEL).join(", ")}`);
  process.exit(1);
}
// With a category, load ONLY that folder, so other categories' work-in-progress
// can't break this check. Cross-category duplicates are caught by a full run.
const GK_DATA: GkData[] = only
  ? require(`../src/engine/gk/data/${only}`).PARTS
  : require("../src/engine/gk/data").GK_DATA;
const data = GK_DATA;

const errors: string[] = [];
const warns: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warns.push(m);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let crossDupes = 0;
const isCls = (c: unknown) => c === 6 || c === 7 || c === 8 || c === 9 || c === 10;
const LONG = 32;

// Every question's normalised text → where it came from, across ALL categories
// (so a category check still catches clashes with the others).
const seen = new Map<string, string>();
const claim = (q: string, a: string, where: string) => {
  const k = qkey(q, a);
  const prev = seen.get(k);
  if (!prev) return void seen.set(k, where);
  // Same category = an authoring slip (error). Across categories the engine
  // keeps the first copy and drops the rest, so it is only counted.
  if (prev.split("/")[0] === where.split("/")[0]) err(`duplicate question (${where}) also in (${prev}): "${q}"`);
  else crossDupes++;
};

for (const d of GK_DATA) {
  const mine = data.includes(d);
  const e = mine ? err : () => {};
  const w = mine ? warn : () => {};

  for (const [tag, list] of Object.entries(d.mcq)) {
    list.forEach((m, i) => {
      const where = `${d.cat}/mcq/${tag}#${i}`;
      if (!Array.isArray(m) || m.length !== 6) return e(`${where}: needs [q, answer, w1, w2, w3, cls]`);
      const [q, a, ...rest] = m;
      const opts = [a, rest[0], rest[1], rest[2]] as string[];
      if (!isCls(rest[3])) e(`${where}: class band must be 6–10`);
      if (opts.some((o) => typeof o !== "string" || !o.trim() || o !== o.trim())) e(`${where}: empty/untrimmed option`);
      if (new Set(opts.map(norm)).size !== 4) e(`${where}: options not distinct: ${opts.join(" | ")}`);
      if (opts.some((o) => o.length > LONG)) w(`${where}: long option (> ${LONG} chars)`);
      if (q.length > 140) w(`${where}: long question (${q.length} chars)`);
      if (mine) claim(q, a, where);
    });
  }

  d.tables.forEach((t, ti) => {
    const tw = `${d.cat}/table/${t.topic}`;
    const n = t.cols.length;
    t.rows.forEach((r, ri) => {
      if (r.length !== n + 1) e(`${tw} row ${ri}: has ${r.length} values, needs ${n} + class`);
      if (!isCls(r[r.length - 1])) e(`${tw} row ${ri}: last value must be class 6–10`);
      r.slice(0, -1).forEach((v) => {
        if (String(v).trim() === "" || String(v) !== String(v).trim()) e(`${tw} row ${ri}: empty/untrimmed value`);
      });
    });
    for (const y of t.years ?? []) {
      t.rows.forEach((r, ri) => {
        if (!/^\d{3,4}$/.test(String(r[y]))) e(`${tw} row ${ri}: year column ${y} must be a 3–4 digit CE year, got "${r[y]}"`);
      });
    }
    const vals = t.rows.map((r) => r.slice(0, -1).map(String));
    t.asks.forEach((ask, ai) => {
      if (ask.to < 0 || ask.to >= n) return e(`${tw} ask ${ai}: 'to' out of range`);
      const refs = ask.q.map((q) => [...q.matchAll(/\{(\d+)\}/g)].map((x) => +x[1]).sort().join(","));
      if (ask.q.length === 0) e(`${tw} ask ${ai}: no templates`);
      if (new Set(refs).size > 1) e(`${tw} ask ${ai}: every phrasing must use the same {columns}`);
      if (refs[0] === "") e(`${tw} ask ${ai}: template references no column`);
      if (refs.some((r) => r.split(",").map(Number).some((c) => c === ask.to || c >= n)))
        e(`${tw} ask ${ai}: template references the answer column or a missing column`);
      // Same rendered question + same answer twice = duplicate.
      const pairs = new Set<string>();
      vals.forEach((v, ri) => {
        const q = fill(ask.q[0], v);
        const key = q + " => " + v[ask.to];
        if (pairs.has(key)) e(`${tw} ask ${ai} row ${ri}: duplicate "${q}" → ${v[ask.to]}`);
        pairs.add(key);
        if (v[ask.to]?.length > LONG) w(`${tw} ask ${ai} row ${ri}: long answer (> ${LONG} chars)`);
        if (q.toLowerCase().includes(v[ask.to]?.toLowerCase() ?? "\u0000") && v[ask.to].length > 3)
          w(`${tw} ask ${ai} row ${ri}: answer appears in question: "${q}"`);
        if (mine) claim(q, v[ask.to], `${tw} ask ${ai} row ${ri}`);
      });
      // Enough distinct wrong options for every row.
      if (!t.years?.includes(ask.to)) {
        const right = new Map<string, Set<string>>();
        vals.forEach((v) => {
          const k = fill(ask.q[0], v);
          if (!right.has(k)) right.set(k, new Set());
          right.get(k)!.add(v[ask.to]);
        });
        const pool = new Set([...vals.map((v) => v[ask.to]), ...(t.extra?.[ask.to] ?? [])]);
        vals.forEach((v, ri) => {
          const bad = right.get(fill(ask.q[0], v))!;
          const ok = [...pool].filter((p) => !bad.has(p)).length;
          if (ok < 3) e(`${tw} ask ${ai} row ${ri}: only ${ok} usable wrong options — add rows or 'extra'`);
        });
      }
    });
    void ti;
  });
}

// Build every question many times: 4 distinct options including the answer.
const specs = allSpecs(data);
for (const s of specs) {
  for (let i = 0; i < 12; i++) {
    const q = buildQuestion(s.make(), s.tag);
    if (q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.includes(q.a)) {
      err(`built badly [${s.cat}/${s.tag}] "${q.q}" → ${q.a} in [${q.options.join(" | ")}]`);
      break;
    }
  }
}

// Counts.
const byCat = new Map<string, number[]>();
for (const s of specs) {
  if (!byCat.has(s.cat)) byCat.set(s.cat, [0, 0, 0, 0, 0]);
  byCat.get(s.cat)![s.cls - 6]++;
}
console.log("category".padEnd(24), "c6".padStart(6), "c7".padStart(6), "c8".padStart(6), "c9".padStart(6), "c10".padStart(6), "total".padStart(7));
for (const [cat, c] of byCat)
  console.log(GK_LABEL[cat as GkCat].padEnd(24), ...c.map((x) => String(x).padStart(6)), String(c.reduce((a, b) => a + b, 0)).padStart(7));
console.log(`TOTAL questions: ${specs.length}` + (crossDupes ? `   (${crossDupes} cross-category duplicates dropped automatically)` : ""));

const show = (label: string, list: string[], max: number) => {
  if (!list.length) return;
  console.log(`\n${label}: ${list.length}`);
  list.slice(0, max).forEach((m) => console.log("  " + m));
  if (list.length > max) console.log(`  … and ${list.length - max} more`);
};
show("Warnings", warns, 40);
show("ERRORS", errors, 200);
console.log(errors.length ? "\n❌ GK CHECK FAILED" : "\n✅ GK CHECK PASSED");
process.exit(errors.length ? 1 : 0);
