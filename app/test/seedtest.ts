import { generateSet, poolFor } from "../src/engine";
const pool = poolFor([6, 7]);
const a = generateSet(pool, 80, 12345);
const b = generateSet(pool, 80, 12345);
const c = generateSet(pool, 80, 99999);
const same = JSON.stringify(a) === JSON.stringify(b);
const diff = JSON.stringify(a) !== JSON.stringify(c);
let bad = 0;
for (const q of a) {
  if (q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.includes(q.a)) bad++;
}
console.log("same seed → identical:", same);
console.log("different seed → different:", diff);
console.log("invalid questions in set:", bad);
console.log(same && diff && bad === 0 ? "✅ SEED DETERMINISM OK" : "❌ PROBLEM");
console.log("sample:", a[0].q, "=>", a[0].options.join(","), "ans", a[0].a);
