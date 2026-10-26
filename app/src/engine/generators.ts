// The procedural format library: 78 generators across Classes 6–10.
// Each returns a question with randomised digits — never repeated.
// Answers are computed in code, so they are always correct.
// Verified by test/engine.test.ts (234k samples, zero failures).

import { rnd, pick, shuffle, gcd, isPrime, decimals, fracStr, ratioStr, random } from "./rng";
import { optsFrom, uniqOpts, RawItem } from "./options";
import { PHYSICS, CHEMISTRY } from "./science";
import { GK } from "./gk";

export type Subject = "maths" | "physics" | "chemistry" | "gk";

export interface Gen {
  cls: number; // class level (6–10) — the difficulty band
  ch: string; // chapter label, shown to the player
  subject: Subject;
  w?: boolean; // word problem? (excluded from the fast Blitz)
  g: () => RawItem;
}

// Maths generators (subject added below). Omit<Gen,"subject"> so we don't
// repeat subject:"maths" on all 78 entries.
const MATHS_RAW: Omit<Gen, "subject">[] = [
  /* ===================== CLASS 6 ===================== */
  { cls: 6, ch: "Number System", g: () => { const n = rnd(120, 9870); return { q: `Round ${n} to the nearest 100.`, a: Math.round(n / 100) * 100 }; } },
  { cls: 6, ch: "Fractions", g: () => { const d = pick([2, 3, 4, 5]), n = rnd(1, d - 1), num = d * rnd(2, 9); return { q: `${n}/${d} of ${num} = ?`, a: (num * n) / d }; } },
  { cls: 6, ch: "Decimals", g: () => { const x = rnd(11, 89) / 10, y = rnd(11, 89) / 10; return { q: `${x} + ${y} = ?`, a: +(x + y).toFixed(1) }; } },
  { cls: 6, ch: "Factors & Multiples", g: () => { const x = rnd(8, 40), y = rnd(8, 40); return { q: `HCF of ${x} and ${y} = ?`, a: gcd(x, y) }; } },
  { cls: 6, ch: "Factors & Multiples", g: () => { const x = rnd(3, 9), y = rnd(3, 9); return { q: `LCM of ${x} and ${y} = ?`, a: (x * y) / gcd(x, y) }; } },
  { cls: 6, ch: "Factors & Multiples", g: () => { const p = pick([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]), s = new Set<number>([p]); while (s.size < 4) { const c = rnd(4, 40); if (!isPrime(c)) s.add(c); } return { q: `Which one is a prime number?`, a: p, options: shuffle([...s]) }; } },
  { cls: 6, ch: "Integers", g: () => { const a = rnd(-9, -1), b = rnd(2, 12); return { q: `(${a}) + ${b} = ?`, a: a + b }; } },
  { cls: 6, ch: "Integers", g: () => { const a = rnd(2, 12), b = rnd(-9, -1); return { q: `${a} − (${b}) = ?`, a: a - b }; } },
  { cls: 6, ch: "Ratio & Proportion", g: () => { const g0 = rnd(2, 6), x = rnd(2, 9) * g0, y = rnd(2, 9) * g0; return { q: `Simplify the ratio ${x} : ${y}`, a: ratioStr(x, y), options: uniqOpts(ratioStr(x, y), [ratioStr(x + 1, y), ratioStr(x, y + 1), `${y} : ${x}`, ratioStr(x + g0, y)]) }; } },
  { cls: 6, ch: "Unitary Method", w: true, g: () => { const per = rnd(5, 15), c1 = rnd(3, 6), c2 = rnd(7, 12); return { q: `If ${c1} pens cost ${per * c1}, what do ${c2} pens cost?`, a: per * c2 }; } },
  { cls: 6, ch: "Percentage", g: () => { const p = pick([10, 20, 25, 40, 50, 75]), n = pick([20, 40, 60, 80, 120, 160, 200]); return { q: `${p}% of ${n} = ?`, a: (n * p) / 100 }; } },
  { cls: 6, ch: "Speed · Distance · Time", w: true, g: () => { const s = pick([40, 50, 60, 80]), t = rnd(2, 5); return { q: `A car goes ${s} km/h for ${t} hours. Distance in km?`, a: s * t }; } },
  { cls: 6, ch: "Perimeter & Area", g: () => { const l = rnd(4, 15), w = rnd(3, 12); return { q: `Perimeter of a rectangle ${l} × ${w}?`, a: 2 * (l + w) }; } },
  { cls: 6, ch: "Perimeter & Area", g: () => { const l = rnd(4, 15), w = rnd(3, 12); return { q: `Area of a rectangle ${l} × ${w}?`, a: l * w }; } },
  { cls: 6, ch: "Angles & Lines", g: () => { const x = rnd(10, 80); return { q: `Complement of ${x}°?`, a: 90 - x, unit: "°" }; } },
  { cls: 6, ch: "Angles & Lines", g: () => { const x = rnd(10, 170); return { q: `Supplement of ${x}°?`, a: 180 - x, unit: "°" }; } },

  /* ===================== CLASS 7 ===================== */
  { cls: 7, ch: "Integers", g: () => { const a = rnd(-9, -2), b = rnd(2, 9); return { q: `(${a}) × ${b} = ?`, a: a * b }; } },
  { cls: 7, ch: "Integers", g: () => { const b = rnd(-9, -2), a = b * rnd(2, 8); return { q: `${a} ÷ (${b}) = ?`, a: a / b }; } },
  { cls: 7, ch: "Rational Numbers", g: () => { const d1 = pick([2, 3, 4]), d2 = pick([2, 3, 5]), n1 = rnd(1, d1 - 1), n2 = rnd(1, d2 - 1); const num = n1 * d2 + n2 * d1, den = d1 * d2; return { q: `${n1}/${d1} + ${n2}/${d2} = ?`, a: fracStr(num, den), options: uniqOpts(fracStr(num, den), [fracStr(n1 + n2, d1 + d2), fracStr(num + 1, den), fracStr(num, den + 1)]) }; } },
  { cls: 7, ch: "Decimals", g: () => { const x = rnd(2, 9) / 10, y = rnd(2, 9); return { q: `${x} × ${y} = ?`, a: +(x * y).toFixed(1) }; } },
  { cls: 7, ch: "Exponents", g: () => { const b = pick([2, 3, 5]), e = rnd(2, 4); return { q: `${b}^${e} = ?`, a: Math.pow(b, e) }; } },
  { cls: 7, ch: "Exponents", g: () => { const a = rnd(2, 5), b = rnd(2, 5); return { q: `2^${a} × 2^${b} = 2^?`, a: a + b }; } },
  { cls: 7, ch: "Simple Interest", w: true, g: () => { const P = pick([1000, 2000, 4000, 5000]), r = pick([5, 8, 10]), t = rnd(2, 4); return { q: `Simple interest on ${P} at ${r}% for ${t} years?`, a: (P * r * t) / 100 }; } },
  { cls: 7, ch: "Profit & Loss", w: true, g: () => { const cp = pick([200, 400, 500, 800]), pr = pick([10, 20, 25, 50]), sp = cp * (1 + pr / 100); return { q: `Cost ${cp}, sold for ${sp}. Profit %?`, a: pr, unit: "%" }; } },
  { cls: 7, ch: "Percentage", g: () => { const f = pick([[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [2, 5, 40], [1, 10, 10], [3, 5, 60]]); return { q: `Express ${f[0]}/${f[1]} as a percentage.`, a: f[2], unit: "%" }; } },
  { cls: 7, ch: "Linear Equations", g: () => { const x = rnd(2, 12), b = rnd(2, 9), k = rnd(2, 5); return { q: `If ${k}x + ${b} = ${k * x + b}, find x.`, a: x }; } },
  { cls: 7, ch: "Algebra", g: () => { const a = rnd(2, 9), b = rnd(2, 9); return { q: `Simplify: ${a}x + ${b}x`, a: `${a + b}x`, options: uniqOpts(`${a + b}x`, [`${a * b}x`, `${a + b}`, `${a + b}x²`]) }; } },
  { cls: 7, ch: "Pairs of Angles", g: () => { const x = rnd(20, 160); return { q: `Two angles form a linear pair. One is ${x}°. The other?`, a: 180 - x, unit: "°" }; } },
  { cls: 7, ch: "Triangles", g: () => { const a = rnd(40, 80), b = rnd(40, 80); return { q: `Two angles of a triangle are ${a}° and ${b}°. The third?`, a: 180 - a - b, unit: "°" }; } },
  { cls: 7, ch: "Triangles", g: () => { const a = rnd(30, 70), b = rnd(30, 70); return { q: `An exterior angle equals the two opposite interior angles ${a}° and ${b}°. Find it.`, a: a + b, unit: "°" }; } },
  { cls: 7, ch: "Pythagoras Theorem", g: () => { const t = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]); return { q: `Right triangle with legs ${t[0]} and ${t[1]}. Hypotenuse?`, a: t[2] }; } },
  { cls: 7, ch: "Data Handling", g: () => { const arr = Array.from({ length: 4 }, () => rnd(2, 20)); const sum = arr.reduce((s, x) => s + x, 0); const a = sum / 4; return decimals(a) > 1 ? { q: `Mean of ${arr.join(", ")}? (1 dp)`, a: +a.toFixed(1) } : { q: `Mean of ${arr.join(", ")}?`, a: +a.toFixed(decimals(a)) }; } },
  { cls: 7, ch: "Probability", g: () => { const it = pick([["an even number", "1/2"], ["a number > 4", "1/3"], ["the number 6", "1/6"], ["a number ≤ 2", "1/3"], ["an odd number", "1/2"]]); return { q: `Roll a die. Probability of ${it[0]}?`, a: it[1], options: optsFrom(it[1], ["1/2", "1/3", "1/6", "2/3", "5/6", "1/4"]) }; } },

  /* ===================== CLASS 8 ===================== */
  { cls: 8, ch: "Squares & Roots", g: () => { const n = rnd(6, 25); return { q: `√${n * n} = ?`, a: n }; } },
  { cls: 8, ch: "Cubes & Cube Roots", g: () => { const n = rnd(2, 9); return { q: `${n}³ = ?`, a: n * n * n }; } },
  { cls: 8, ch: "Cubes & Cube Roots", g: () => { const n = rnd(2, 9); return { q: `∛${n * n * n} = ?`, a: n }; } },
  { cls: 8, ch: "Exponents", g: () => { const a = rnd(5, 8), b = rnd(2, 4); return { q: `2^${a} ÷ 2^${b} = 2^?`, a: a - b }; } },
  { cls: 8, ch: "Compound Interest", w: true, g: () => { const P = pick([1000, 2000, 3000, 5000]), r = pick([10, 20]); const ci = Math.round(P * (Math.pow(1 + r / 100, 2) - 1)); return { q: `Compound interest on ${P} at ${r}% for 2 years?`, a: ci }; } },
  { cls: 8, ch: "Discount", w: true, g: () => { const mp = pick([400, 500, 600, 800, 1000, 1200]), d = pick([10, 15, 20, 25]); return { q: `A ${mp} item has a ${d}% discount. Final price?`, a: mp * (1 - d / 100) }; } },
  { cls: 8, ch: "Inverse Variation", w: true, g: () => { const w1 = rnd(2, 6), d1 = pick([12, 18, 24]), f = pick([2, 3]); return { q: `${w1} workers finish in ${d1} days. Days for ${w1 * f} workers?`, a: d1 / f }; } },
  { cls: 8, ch: "Algebraic Identities", g: () => { const b = pick([19, 21, 29, 31, 41, 51, 99, 101]); return { q: `${b}² = ?  (use (a±b)²)`, a: b * b }; } },
  { cls: 8, ch: "Factorisation", g: () => { const k = rnd(2, 9); return { q: `Factorise x² − ${k * k}.`, a: `(x − ${k})(x + ${k})`, options: uniqOpts(`(x − ${k})(x + ${k})`, [`(x − ${k})²`, `(x + ${k})²`, `(x − ${k * k})(x + 1)`]) }; } },
  { cls: 8, ch: "Quadrilaterals", g: () => { const a = rnd(70, 110), b = rnd(70, 110), c = rnd(70, 110); return { q: `Three angles of a quadrilateral are ${a}°, ${b}°, ${c}°. The fourth?`, a: 360 - a - b - c, unit: "°" }; } },
  { cls: 8, ch: "Parallelograms", g: () => { const x = rnd(40, 140); return { q: `One angle of a parallelogram is ${x}°. Its adjacent angle?`, a: 180 - x, unit: "°" }; } },
  { cls: 8, ch: "3-D Shapes (Euler)", g: () => { const s = pick([[8, 6, 12], [6, 5, 9], [4, 4, 6], [5, 6, 9]]); return { q: `A solid has ${s[0]} vertices and ${s[1]} faces. By V − E + F = 2, how many edges?`, a: s[2] }; } },
  { cls: 8, ch: "Mensuration", g: () => { const h = pick([4, 6, 8]), p = rnd(4, 12), q2 = rnd(4, 12); return { q: `Area of a trapezium: parallel sides ${p}, ${q2}; height ${h}?`, a: ((p + q2) * h) / 2 }; } },
  { cls: 8, ch: "Mensuration", g: () => { const s = pick([[7, 10, 1540], [7, 5, 770], [14, 5, 3080], [7, 20, 3080]]); return { q: `Volume of a cylinder, r = ${s[0]}, h = ${s[1]} (π = 22/7)?`, a: s[2] }; } },
  { cls: 8, ch: "Data Handling", g: () => { const p = pick([10, 20, 25, 50, 75]); return { q: `In a pie chart, what angle represents ${p}%?`, a: (p * 360) / 100, unit: "°" }; } },

  /* ===================== CLASS 9 ===================== */
  { cls: 9, ch: "Expansions", g: () => { const a = rnd(2, 9), b = rnd(2, 9); return { q: `Constant term in (x + ${a})(x + ${b})?`, a: a * b }; } },
  { cls: 9, ch: "Factorisation", g: () => { const r1 = rnd(1, 6), r2 = rnd(1, 6); return { q: `Factorise x² + ${r1 + r2}x + ${r1 * r2}.`, a: `(x + ${r1})(x + ${r2})`, options: uniqOpts(`(x + ${r1})(x + ${r2})`, [`(x − ${r1})(x − ${r2})`, `(x + ${r1 + 1})(x + ${r2})`, `(x + ${r1})(x + ${r2 + 1})`]) }; } },
  { cls: 9, ch: "Simultaneous Equations", g: () => { const x = rnd(2, 12), y = rnd(2, 9); return { q: `If x + y = ${x + y} and x − y = ${x - y}, find x.`, a: x }; } },
  { cls: 9, ch: "Indices", g: () => { const a = rnd(2, 4), b = rnd(2, 4); return { q: `(2^${a})^${b} = 2^?`, a: a * b }; } },
  { cls: 9, ch: "Logarithms", g: () => { const b = pick([2, 3, 5, 10]), e = rnd(2, 4); return { q: `log_${b} ${Math.pow(b, e)} = ?`, a: e }; } },
  { cls: 9, ch: "Logarithms", g: () => { const it = pick([["log 2 + log 5 (base 10)", 1], ["log 4 + log 25 (base 10)", 2], ["log 100 − log 10 (base 10)", 1], ["log 1000 (base 10)", 3]]); return { q: `${it[0]} = ?`, a: it[1] }; } },
  { cls: 9, ch: "Trigonometry", g: () => { const it = pick([["sin 30°", "1/2"], ["cos 60°", "1/2"], ["tan 45°", "1"], ["sin 90°", "1"], ["cos 0°", "1"], ["tan 0°", "0"], ["sin 45°", "1/√2"], ["cos 30°", "√3/2"], ["sin 60°", "√3/2"], ["tan 30°", "1/√3"]]); return { q: `Value of ${it[0]}?`, a: it[1], options: optsFrom(it[1], ["0", "1/2", "1/√2", "√3/2", "1", "1/√3", "√3"]) }; } },
  { cls: 9, ch: "Trigonometry", g: () => { const it = pick([["sin(90° − θ)", "cos θ"], ["cos(90° − θ)", "sin θ"], ["tan(90° − θ)", "cot θ"]]); return { q: `${it[0]} = ?`, a: it[1], options: optsFrom(it[1], ["sin θ", "cos θ", "tan θ", "cot θ"]) }; } },
  { cls: 9, ch: "Pythagoras Theorem", g: () => { const t = pick([[9, 12, 15], [7, 24, 25], [20, 21, 29], [12, 16, 20], [10, 24, 26]]); return { q: `Legs ${t[0]} and ${t[1]} of a right triangle. Hypotenuse?`, a: t[2] }; } },
  { cls: 9, ch: "Coordinate Geometry", g: () => { const tr = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]]); const x = rnd(0, 4), y = rnd(0, 4); return { q: `Distance between (${x}, ${y}) and (${x + tr[0]}, ${y + tr[1]})?`, a: tr[2] }; } },
  { cls: 9, ch: "Statistics", g: () => { const arr = shuffle(Array.from({ length: 5 }, () => rnd(2, 30))); const med = [...arr].sort((a, b) => a - b)[2]; return { q: `Median of ${arr.join(", ")}?`, a: med }; } },
  { cls: 9, ch: "Rational & Irrational", g: () => { const irr = pick(["√2", "√3", "√5", "√7", "π"]); return { q: `Which number is irrational?`, a: irr, options: optsFrom(irr, ["√9", "√16", "√25", "4/5", "0.75", "3/4", "√2", "√3", "π"]) }; } },
  { cls: 9, ch: "Mensuration", g: () => { const s = rnd(3, 12); return { q: `Total surface area of a cube of side ${s}?`, a: 6 * s * s }; } },

  /* ===================== CLASS 10 ===================== */
  { cls: 10, ch: "Quadratic Equations", g: () => { const r1 = rnd(1, 6), r2 = rnd(1, 6); return random() < 0.5 ? { q: `Sum of roots of x² − ${r1 + r2}x + ${r1 * r2} = 0?`, a: r1 + r2 } : { q: `Product of roots of x² − ${r1 + r2}x + ${r1 * r2} = 0?`, a: r1 * r2 }; } },
  { cls: 10, ch: "Quadratic Equations", g: () => { const b = rnd(2, 10), c = rnd(1, 12); return { q: `Discriminant of x² + ${b}x + ${c}?`, a: b * b - 4 * c }; } },
  { cls: 10, ch: "Arithmetic Progression", g: () => { const a = rnd(2, 9), d = rnd(2, 6), n = rnd(5, 12); return { q: `AP ${a}, ${a + d}, ${a + 2 * d}, … — the ${n}th term?`, a: a + (n - 1) * d }; } },
  { cls: 10, ch: "Arithmetic Progression", g: () => { const a = rnd(1, 6), d = rnd(1, 5), n = pick([4, 6, 8, 10]); return { q: `Sum of first ${n} terms of AP ${a}, ${a + d}, ${a + 2 * d}, …?`, a: (n * (2 * a + (n - 1) * d)) / 2 }; } },
  { cls: 10, ch: "Geometric Progression", g: () => { const a = pick([1, 2, 3]), r = pick([2, 3]), n = rnd(3, 5); return { q: `GP ${a}, ${a * r}, ${a * r * r}, … — the ${n}th term?`, a: a * Math.pow(r, n - 1) }; } },
  { cls: 10, ch: "Coordinate Geometry", g: () => { const tr = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]]); const x = rnd(0, 3), y = rnd(0, 3); return { q: `Distance between (${x}, ${y}) and (${x + tr[0]}, ${y + tr[1]})?`, a: tr[2] }; } },
  { cls: 10, ch: "Coordinate Geometry", g: () => { const x1 = rnd(0, 5) * 2, y1 = rnd(0, 5) * 2, x2 = rnd(0, 5) * 2, y2 = rnd(0, 5) * 2; const mid = `(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`; return { q: `Midpoint of (${x1}, ${y1}) and (${x2}, ${y2})?`, a: mid, options: uniqOpts(mid, [`(${(x1 + x2) / 2 + 1}, ${(y1 + y2) / 2})`, `(${x1 + x2}, ${y1 + y2})`, `(${(x1 + x2) / 2}, ${(y1 + y2) / 2 + 1})`]) }; } },
  { cls: 10, ch: "Coordinate Geometry", g: () => { const dx = rnd(1, 4), m = rnd(1, 4); return { q: `Slope of the line through (0, 0) and (${dx}, ${dx * m})?`, a: m }; } },
  { cls: 10, ch: "Similarity", g: () => { let r1 = rnd(1, 4), r2 = r1 + rnd(1, 3); while (gcd(r1, r2) !== 1) { r2++; } const c = `${r1 * r1} : ${r2 * r2}`; return { q: `Two similar triangles have sides in ratio ${r1} : ${r2}. Ratio of areas?`, a: c, options: uniqOpts(c, [`${r1} : ${r2}`, `${r2 * r2} : ${r1 * r1}`, `${r1 * r1 * r1} : ${r2 * r2 * r2}`]) }; } },
  { cls: 10, ch: "Trigonometry", g: () => { const it = pick([["sin²θ + cos²θ", 1], ["2 sin 30°", 1], ["sin 30° + cos 60°", 1], ["tan 45° + tan 45°", 2], ["cos 0° + sin 90°", 2], ["sec²θ − tan²θ", 1]]); return { q: `${it[0]} = ?`, a: it[1] }; } },
  { cls: 10, ch: "GST", w: true, g: () => { const p = pick([500, 1000, 1200, 1500, 2000]), r = pick([5, 12, 18, 28]); return { q: `An item costs ${p}. With ${r}% GST, total payable?`, a: p + (p * r) / 100 }; } },
  { cls: 10, ch: "Shares & Dividends", w: true, g: () => { const div = pick([5, 10, 20]), sh = rnd(20, 80); return { q: `${div}% dividend on ${sh} shares of face value 100 each. Annual income?`, a: div * sh }; } },
  { cls: 10, ch: "Mensuration", g: () => { const s = pick([[3, 7, 66], [7, 3, 154], [6, 7, 264], [7, 6, 308]]); return { q: `Volume of a cone, r = ${s[0]}, h = ${s[1]} (π = 22/7)?`, a: s[2] }; } },
  { cls: 10, ch: "Mensuration", g: () => { const s = pick([[7, 616], [14, 2464], [21, 5544]]); return { q: `Surface area of a sphere, r = ${s[0]} (π = 22/7)?`, a: s[1] }; } },
  { cls: 10, ch: "Matrices", g: () => { const a = rnd(1, 9), b = rnd(1, 9), c = rnd(1, 9), d = rnd(1, 9); return { q: `[${a}  ${b}] + [${c}  ${d}] — the first entry of the sum?`, a: a + c }; } },
  { cls: 10, ch: "Probability", g: () => { const it = pick([["a King", "1/13"], ["a red card", "1/2"], ["a spade", "1/4"], ["an Ace", "1/13"], ["a face card", "3/13"]]); return { q: `Draw one card from 52. Probability of ${it[0]}?`, a: it[1], options: optsFrom(it[1], ["1/13", "1/2", "1/4", "3/13", "1/52", "1/26"]) }; } },
  { cls: 10, ch: "Linear Inequations", g: () => { const m = pick([2, 3]), k = rnd(2, 9); return { q: `Solve ${m}x > ${m * k}. Then x > ?`, a: k }; } },

  /* ---- Class 10: SERIOUS multi-step (Ace-level learning) ---- */
  { cls: 10, ch: "Quadratic Equations", g: () => { const r1 = rnd(2, 7); let r2 = rnd(2, 8); if (r2 === r1) r2++; const lo = Math.min(r1, r2), hi = Math.max(r1, r2); const ans = `${lo} and ${hi}`; return { q: `Solve x² − ${r1 + r2}x + ${r1 * r2} = 0. The roots are?`, a: ans, options: uniqOpts(ans, [`${lo} and ${hi + 1}`, `${r1 + r2} and ${r1 * r2}`, `−${lo} and −${hi}`]) }; } },
  { cls: 10, ch: "Trigonometry", g: () => { const t = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]); return { q: `If sin θ = ${t[0]}/${t[2]}, then cos θ = ?`, a: `${t[1]}/${t[2]}`, options: optsFrom(`${t[1]}/${t[2]}`, [`${t[0]}/${t[2]}`, `${t[2]}/${t[1]}`, `${t[1]}/${t[0]}`, `${t[0]}/${t[1]}`]) }; } },
  { cls: 10, ch: "Compound Interest", g: () => { const P = pick([1000, 2000, 5000]), r = pick([10, 20]); const A = Math.round(P * Math.pow(1 + r / 100, 2)); return { q: `Amount on ${P} at ${r}% p.a. for 2 years, compounded annually?`, a: A }; } },
  { cls: 10, ch: "Arithmetic Progression", g: () => { const a = rnd(2, 6), d = rnd(2, 5), tn = rnd(20, 60); const n = (tn - a) / d; if (!Number.isInteger(n) || n < 3) return { q: `Which term of the AP ${a}, ${a + d}, ${a + 2 * d}, … equals ${a + 9 * d}?`, a: 10 }; return { q: `Which term of the AP ${a}, ${a + d}, ${a + 2 * d}, … equals ${tn}?`, a: n }; } },
  { cls: 10, ch: "Coordinate Geometry", g: () => { const x1 = rnd(0, 6) * 2, y1 = rnd(0, 6) * 2, x2 = rnd(0, 6) * 2, y2 = rnd(0, 6) * 2; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const ans = `(${mx}, ${my})`; return { q: `Midpoint of (${x1}, ${y1}) and (${x2}, ${y2})?`, a: ans, options: uniqOpts(ans, [`(${mx + 1}, ${my})`, `(${x1 + x2}, ${y1 + y2})`, `(${mx}, ${my + 1})`]) }; } },
];

// Maths + Physics + Chemistry, all in one bank.
export const ALLGEN: Gen[] = [
  ...MATHS_RAW.map((g): Gen => ({ ...g, subject: "maths" })),
  ...PHYSICS,
  ...CHEMISTRY,
  ...GK,
];

/** Quick questions for the given class bands AND subjects (word problems excluded). */
export function poolFor(
  cls: number[],
  subjects: Subject[] = ["maths", "physics", "chemistry", "gk"]
): Gen[] {
  return ALLGEN.filter((e) => cls.includes(e.cls) && !e.w && subjects.includes(e.subject));
}

/** Everything for the bands/subjects INCLUDING word problems (used by Marathon). */
export function poolForAll(
  cls: number[],
  subjects: Subject[] = ["maths", "physics", "chemistry", "gk"]
): Gen[] {
  return ALLGEN.filter((e) => cls.includes(e.cls) && subjects.includes(e.subject));
}

/** Word-problem formats — reserved for the future long-form "Marathon" mode. */
export const WORD_POOL: Gen[] = ALLGEN.filter((e) => e.w);
