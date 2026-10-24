import { ALLGEN } from "../src/engine/generators";
function countSubject(sub: string) {
  let total = 0, recall = 0, gen = 0;
  for (const e of ALLGEN.filter((g) => g.subject === sub)) {
    const seen = new Set<string>();
    for (let i = 0; i < 40000; i++) seen.add(e.g().q);
    total += seen.size;
    gen++;
    if (seen.size === 1) recall++;
  }
  return { gen, total, recall, calc: gen - recall };
}
for (const s of ["physics", "maths", "chemistry"]) {
  const r = countSubject(s);
  console.log(`${s}: ${r.gen} formats → ~${r.total.toLocaleString()} distinct questions  (${r.recall} recall, ${r.calc} variable)`);
}
