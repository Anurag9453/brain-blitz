// Exports every GK question as JSON rows for a human review sheet.
// Run: npx tsx scripts/gk-export.ts > gk.json
//
// Each row has a Ref that points back to its exact place in the data
// (category / part / mcq tag + index, or table topic + row + ask), so a
// reviewer's "wrong" mark can be fixed at the source.

import { GK_DATA } from "../src/engine/gk/data";
import { fill, GK_LABEL, qkey } from "../src/engine/gk/build";
import { setSeed, clearSeed, shuffle } from "../src/engine/rng";

interface Row {
  ref: string;
  category: string;
  topic: string;
  band: number;
  question: string;
  answer: string;
  wrong: string;
  kind: string;
}

const rows: Row[] = [];
const partNo = new Map<string, number>();
const seen = new Set<string>(); // same question in two categories is listed once (first wins), like the engine
setSeed(20261024); // stable sample of table wrong options

for (const d of GK_DATA) {
  const p = (partNo.get(d.cat) ?? 0) + 1;
  partNo.set(d.cat, p);
  const cat = GK_LABEL[d.cat];

  for (const [tag, list] of Object.entries(d.mcq)) {
    list.forEach(([q, a, w1, w2, w3, cls], i) => {
      if (seen.has(qkey(q, a))) return;
      seen.add(qkey(q, a));
      rows.push({ ref: `${d.cat}/part${p}/mcq/${tag}#${i + 1}`, category: cat, topic: tag, band: cls, question: q, answer: a, wrong: [w1, w2, w3].join("  |  "), kind: "Written" });
    });
  }

  for (const t of d.tables) {
    const vals = t.rows.map((r) => r.slice(0, -1).map(String));
    t.asks.forEach((ask, ai) => {
      const right = new Map<string, Set<string>>();
      vals.forEach((v) => {
        const k = fill(ask.q[0], v);
        if (!right.has(k)) right.set(k, new Set());
        right.get(k)!.add(v[ask.to]);
      });
      const pool = [...new Set([...vals.map((v) => v[ask.to]), ...(t.extra?.[ask.to] ?? [])])];
      const isYear = !!t.years?.includes(ask.to);
      vals.forEach((v, ri) => {
        const dk = qkey(fill(ask.q[0], v), v[ask.to]);
        if (seen.has(dk)) return;
        seen.add(dk);
        const bad = right.get(fill(ask.q[0], v))!;
        const wrong = isYear ? "(nearby years, varies)" : shuffle(pool.filter((x) => !bad.has(x))).slice(0, 3).join("  |  ") + "  (sample — varies)";
        const phrasings = ask.q.map((q) => fill(q, v));
        rows.push({
          ref: `${d.cat}/part${p}/table/${t.topic}/row${ri + 1}/ask${ai + 1}`,
          category: cat,
          topic: t.topic,
          band: t.rows[ri][t.rows[ri].length - 1] as number,
          question: phrasings.join("\n"),
          answer: v[ask.to],
          wrong,
          kind: "Table",
        });
      });
    });
  }
}
clearSeed();
process.stdout.write(JSON.stringify(rows));
