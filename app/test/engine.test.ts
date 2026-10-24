// Standalone validation: exercises every generator thousands of times and
// asserts each question has 4 unique options containing the correct answer.
// Run: npx tsx test/engine.test.ts   (or: npm test)

import { ALLGEN, poolFor } from "../src/engine/generators";
import { buildQuestion } from "../src/engine/options";
import { DEFAULT_LEVELS } from "../src/engine/levels";

let fails = 0;
let checked = 0;

for (const e of ALLGEN) {
  for (let t = 0; t < 3000; t++) {
    const q = buildQuestion(e.g(), e.ch);
    checked++;
    const opts = q.options.map(String);
    const problems: string[] = [];
    if (opts.length !== 4) problems.push(`not 4 options (${opts.length})`);
    if (new Set(opts).size !== opts.length) problems.push(`dup options: ${opts.join(",")}`);
    if (!opts.includes(q.a)) problems.push(`answer '${q.a}' not in [${opts.join(", ")}]`);
    if (q.a === undefined || q.a === "undefined" || q.a === "NaN") problems.push(`bad answer: ${q.a}`);
    if (/undefined|NaN/.test(q.q)) problems.push(`bad question: ${q.q}`);
    if (problems.length) {
      fails++;
      if (fails <= 25) console.log(`✗ [${e.cls}|${e.ch}] "${q.q}" → ${problems.join(" ; ")}`);
    }
  }
}

const word = ALLGEN.filter((e) => e.w).length;
const bySubject = { maths: 0, physics: 0, chemistry: 0 } as Record<string, number>;
for (const e of ALLGEN) bySubject[e.subject]++;
console.log(`\nGenerators: ${ALLGEN.length} | quick: ${ALLGEN.length - word} | word: ${word}`);
console.log("by subject:", JSON.stringify(bySubject));
for (const l of DEFAULT_LEVELS) {
  console.log(`Level ${l.n} ${l.name}: ${poolFor(l.cls).length} formats`);
}
console.log(`Checked: ${checked} | Failures: ${fails}`);
console.log(fails === 0 ? "✅ ALL PASS" : "❌ FAILURES ABOVE");
process.exit(fails === 0 ? 0 : 1);
