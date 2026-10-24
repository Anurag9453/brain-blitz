import { ALLGEN } from "../src/engine/generators";
for (const sub of ["physics", "chemistry"]) {
  console.log(`\n========== ${sub.toUpperCase()} (fact/recall) ==========`);
  for (const e of ALLGEN.filter((g) => g.subject === sub)) {
    const pairs = new Map<string, string>();
    for (let i = 0; i < 60000; i++) {
      const it = e.g();
      pairs.set(it.q, String(it.a) + (it.unit ?? ""));
    }
    if (pairs.size > 30) continue; // calc formats are computed → skip
    for (const [q, a] of pairs) console.log(`[${e.cls}|${e.ch}] ${q}  →  ${a}`);
  }
}
