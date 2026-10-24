// Physics & Chemistry generators (Classes 6–10).
//  • Recall questions ROTATE phrasing (pick of several wordings) so the same
//    fact is never asked the same way twice — more variety, more original.
//  • DATA-TABLE generators: one format draws from a table → many questions.
//  • Class 9–10 include "serious" multi-step problems (real learning, not just
//    a game).  All facts hand-verified; calculations computed in code.

import { rnd, pick, shuffle } from "./rng";
import { optsFrom } from "./options";
import type { RawItem } from "./options";
import type { Gen } from "./generators";

/* ---------- shared data ---------- */
const UNIT_BANK = ["metre", "kilogram", "second", "kelvin", "newton", "joule", "watt", "pascal", "ampere", "hertz", "ohm", "volt", "coulomb"];
const UNITS_BASIC: [string, string][] = [["length", "metre"], ["mass", "kilogram"], ["time", "second"], ["temperature", "kelvin"]];
const UNITS_MECH: [string, string][] = [["force", "newton"], ["energy", "joule"], ["work", "joule"], ["pressure", "pascal"], ["power", "watt"]];
const UNITS_ELEC: [string, string][] = [["electric current", "ampere"], ["frequency", "hertz"], ["resistance", "ohm"], ["potential difference", "volt"], ["charge", "coulomb"]];
const STATES: [string, string][] = [["a fixed shape and a fixed volume", "Solid"], ["a fixed volume but no fixed shape", "Liquid"], ["no fixed shape and no fixed volume", "Gas"]];
const CHANGES: [string, string][] = [["Solid → liquid", "melting"], ["Liquid → gas at the boiling point", "boiling"], ["Liquid → gas at the surface, at any temperature", "evaporation"], ["Gas → liquid", "condensation"], ["Liquid → solid", "freezing"], ["Solid → gas directly", "sublimation"], ["Gas → solid directly", "deposition"]];
const CHANGE_BANK = ["melting", "boiling", "evaporation", "condensation", "freezing", "sublimation", "deposition"];
const VECTORS: [string, string][] = [["velocity", "vector"], ["displacement", "vector"], ["acceleration", "vector"], ["force", "vector"], ["speed", "scalar"], ["distance", "scalar"], ["mass", "scalar"], ["time", "scalar"], ["energy", "scalar"]];
const SOUND_RANGE: [string, string][] = [["below 20 Hz", "infrasonic"], ["between 20 Hz and 20,000 Hz", "audible"], ["above 20,000 Hz", "ultrasonic"]];
const FREEFALL: [number, number][] = [[5, 10], [20, 20], [45, 30], [80, 40]]; // [height, v=√(2·10·h)]

/* ===================== PHYSICS ===================== */
export const PHYSICS: Gen[] = [
  /* ---- Class 6 ---- */
  { cls: 6, ch: "States of Matter", subject: "physics", g: (): RawItem => { const [p, s] = pick(STATES); return { q: pick([`Which state has ${p}?`, `A substance with ${p} is a ___.`]), a: s, options: ["Solid", "Liquid", "Gas", "Plasma"] }; } },
  { cls: 6, ch: "Measurement", subject: "physics", g: (): RawItem => { const [q0, u] = pick(UNITS_BASIC); return { q: pick([`SI unit of ${q0}?`, `${q0.charAt(0).toUpperCase() + q0.slice(1)} is measured in ___?`, `The SI unit of ${q0} is ___.`]), a: u, options: optsFrom(u, UNIT_BANK) }; } },
  { cls: 6, ch: "Measurement", subject: "physics", g: () => ({ q: pick(["Instrument used to measure temperature?", "Which instrument measures temperature?"]), a: "Thermometer", options: ["Thermometer", "Barometer", "Ammeter", "Ruler"] }) },
  { cls: 6, ch: "Force", subject: "physics", g: () => ({ q: pick(["A force is a push or a ___.", "Besides a push, a force can be a ___.", "A pull or a ___ is a force."]), a: "pull", options: ["pull", "lift", "drop", "bend"] }) },
  { cls: 6, ch: "Friction", subject: "physics", g: () => ({ q: pick(["The force that opposes motion between surfaces?", "Which force resists sliding between two surfaces?"]), a: "Friction", options: ["Friction", "Gravity", "Tension", "Thrust"] }) },
  { cls: 6, ch: "Friction", subject: "physics", g: () => ({ q: pick(["Friction always acts ___ to the motion.", "The direction of friction is ___ to motion."]), a: "opposite", options: ["opposite", "same", "perpendicular", "upward"] }) },
  { cls: 6, ch: "Light", subject: "physics", g: () => ({ q: pick(["Light travels in a ___ line.", "In a uniform medium, light travels in a ___ path."]), a: "straight", options: ["straight", "curved", "zigzag", "circular"] }) },
  { cls: 6, ch: "Light", subject: "physics", g: () => ({ q: pick(["A pinhole camera works because light travels in straight lines. This is ___ propagation.", "Shadows form because light shows ___ propagation."]), a: "rectilinear", options: ["rectilinear", "circular", "random", "reflected"] }) },
  { cls: 6, ch: "Magnetism", subject: "physics", g: () => ({ q: pick(["Which material is magnetic?", "Which of these is attracted by a magnet?"]), a: "Iron", options: ["Iron", "Wood", "Plastic", "Rubber"] }) },
  { cls: 6, ch: "Magnetism", subject: "physics", g: () => ({ q: pick(["Like poles of two magnets ___.", "Two north poles brought close will ___."]), a: "repel", options: ["repel", "attract", "neutralise", "melt"] }) },
  { cls: 6, ch: "Magnetism", subject: "physics", g: () => ({ q: pick(["A freely suspended magnet comes to rest pointing ___.", "A freely hung magnet aligns along the ___ direction."]), a: "North–South", options: ["North–South", "East–West", "up–down", "randomly"] }) },
  { cls: 6, ch: "Simple Machines", subject: "physics", g: () => { const la = rnd(2, 5), k = rnd(2, 4), ea = la * k, effort = rnd(2, 9) * 10, L = effort * k; return { q: `Lever: load ${L} N at ${la} m, effort arm ${ea} m. Effort needed?`, a: effort, unit: " N" }; } },

  /* ---- Class 7 ---- */
  { cls: 7, ch: "Density", subject: "physics", g: () => ({ q: pick(["Density = mass ÷ ___.", "Density equals mass divided by ___."]), a: "volume", options: ["volume", "area", "time", "weight"] }) },
  { cls: 7, ch: "Density", subject: "physics", g: () => { const v = rnd(2, 9), d = rnd(2, 9), m = d * v; return { q: pick([`Mass ${m} g, volume ${v} cm³. Density?`, `A ${m} g object occupies ${v} cm³. Its density?`]), a: d, unit: " g/cm³" }; } },
  { cls: 7, ch: "Measurement", subject: "physics", g: () => { const a = rnd(2, 6), b = rnd(2, 6), c = rnd(2, 6); return { q: `Volume of a ${a} × ${b} × ${c} cm box?`, a: a * b * c, unit: " cm³" }; } },
  { cls: 7, ch: "Motion", subject: "physics", g: () => { const t = rnd(2, 9), s = t * rnd(2, 9); return { q: pick([`A body covers ${s} m in ${t} s. Average speed?`, `Travelling ${s} m in ${t} s, the speed is?`]), a: s / t, unit: " m/s" }; } },
  { cls: 7, ch: "Reflection", subject: "physics", g: () => { const x = rnd(10, 80); return { q: pick([`A ray strikes a plane mirror at ${x}°. Angle of reflection?`, `Angle of incidence is ${x}°. Find the angle of reflection.`]), a: x, unit: "°" }; } },
  { cls: 7, ch: "Light", subject: "physics", g: () => ({ q: pick(["The primary colours of light are red, green and ___.", "Red, green and ___ are the primary colours of light.", "Along with red and green, the third primary colour of light is ___."]), a: "blue", options: ["blue", "yellow", "white", "cyan"] }) },
  { cls: 7, ch: "Light", subject: "physics", g: () => ({ q: pick(["Red, green and blue light combine to make ___ light.", "Adding red, green and blue light gives ___."]), a: "white", options: ["white", "black", "grey", "brown"] }) },
  { cls: 7, ch: "Heat", subject: "physics", g: () => ({ q: pick(["Conduction, convection and ___ are the methods of heat transfer.", "The three modes of heat transfer are conduction, convection and ___."]), a: "radiation", options: ["radiation", "reflection", "refraction", "vibration"] }) },
  { cls: 7, ch: "Sound", subject: "physics", g: () => ({ q: pick(["Sound is a ___ wave.", "By nature, a sound wave is ___."]), a: "longitudinal", options: ["longitudinal", "transverse", "electromagnetic", "standing"] }) },
  { cls: 7, ch: "Sound", subject: "physics", g: () => ({ q: pick(["The loudness of a sound depends on its ___.", "Greater ___ means a louder sound."]), a: "amplitude", options: ["amplitude", "frequency", "speed", "wavelength"] }) },
  { cls: 7, ch: "Sound", subject: "physics", g: () => ({ q: pick(["Sound travels fastest through ___.", "In which medium is the speed of sound greatest?"]), a: "solids", options: ["solids", "liquids", "gases", "vacuum"] }) },
  { cls: 7, ch: "Electricity", subject: "physics", g: () => ({ q: pick(["Electric current is the flow of ___.", "A flow of ___ constitutes electric current."]), a: "charge", options: ["charge", "heat", "light", "mass"] }) },
  { cls: 7, ch: "Electricity", subject: "physics", g: () => ({ q: pick(["Which is a good conductor of electricity?", "Which of these conducts electricity well?"]), a: "Copper", options: ["Copper", "Rubber", "Wood", "Glass"] }) },
  { cls: 7, ch: "Magnetism", subject: "physics", g: () => ({ q: pick(["The sure test for a magnet is ___.", "A magnet is confirmed only by ___."]), a: "repulsion", options: ["repulsion", "attraction", "weighing", "heating"] }) },

  /* ---- Class 8 ---- */
  { cls: 8, ch: "Kinetic Theory", subject: "physics", g: () => ({ q: pick(["Particles move fastest in which state?", "In which state do molecules have the most freedom?"]), a: "Gas", options: ["Gas", "Solid", "Liquid", "All equally"] }) },
  { cls: 8, ch: "Change of State", subject: "physics", g: (): RawItem => { const [c, p] = pick(CHANGES); return { q: pick([`${c} is called ___.`, `The process "${c}" is known as ___.`]), a: p, options: optsFrom(p, CHANGE_BANK) }; } },
  { cls: 8, ch: "Floatation", subject: "physics", g: () => ({ q: pick(["An object floats if its density is ___ than the liquid.", "For floating, an object's density must be ___ than the fluid's."]), a: "less", options: ["less", "more", "equal", "double"] }) },
  { cls: 8, ch: "Moment of Force", subject: "physics", g: () => { const f = rnd(2, 12), d = rnd(2, 9); return { q: `Moment of a ${f} N force acting ${d} m from the pivot?`, a: f * d, unit: " N·m" }; } },
  { cls: 8, ch: "Pressure", subject: "physics", g: () => { const a = rnd(2, 6), f = a * rnd(2, 9); return { q: pick([`Pressure of ${f} N on ${a} m²?`, `A ${f} N force spread over ${a} m² gives a pressure of?`]), a: f / a, unit: " Pa" }; } },
  { cls: 8, ch: "Mirrors", subject: "physics", g: () => ({ q: pick(["A concave mirror is a ___ mirror.", "By its action, a concave mirror is ___."]), a: "converging", options: ["converging", "diverging", "plane", "flat"] }) },
  { cls: 8, ch: "Work & Energy", subject: "physics", g: () => { const f = rnd(2, 12), d = rnd(2, 9); return { q: `Work done by a ${f} N force over ${d} m?`, a: f * d, unit: " J" }; } },
  { cls: 8, ch: "Potential Energy", subject: "physics", g: () => { const m = rnd(1, 9), h = rnd(2, 9); return { q: `PE of a ${m} kg body at height ${h} m (g = 10)?`, a: m * 10 * h, unit: " J" }; } },
  { cls: 8, ch: "Kinetic Energy", subject: "physics", g: () => { const m = rnd(1, 9), v = pick([2, 4, 6]); return { q: `KE of a ${m} kg body moving at ${v} m/s?`, a: 0.5 * m * v * v, unit: " J" }; } },
  { cls: 8, ch: "Light", subject: "physics", g: () => ({ q: pick(["The bending of light entering water is called ___.", "Light changes direction entering glass — this is ___."]), a: "refraction", options: ["refraction", "reflection", "dispersion", "diffusion"] }) },
  { cls: 8, ch: "Light", subject: "physics", g: () => ({ q: pick(["Splitting of white light into colours is ___.", "A prism produces a spectrum by ___."]), a: "dispersion", options: ["dispersion", "reflection", "refraction", "scattering"] }) },
  { cls: 8, ch: "Heat", subject: "physics", g: () => ({ q: pick(["Which expands the most for the same heating?", "For equal temperature rise, which expands most?"]), a: "Gas", options: ["Gas", "Liquid", "Solid", "All equally"] }) },
  { cls: 8, ch: "Sound", subject: "physics", g: () => ({ q: pick(["A higher frequency gives a higher ___.", "Pitch increases as ___ increases."]), a: "pitch", options: ["pitch", "loudness", "speed", "echo"] }) },
  { cls: 8, ch: "Sound", subject: "physics", g: () => ({ q: pick(["Loudness is measured in ___.", "The unit of loudness is the ___."]), a: "decibels", options: ["decibels", "hertz", "joules", "watts"] }) },
  { cls: 8, ch: "Electricity", subject: "physics", g: () => ({ q: pick(["Household electrical energy is measured in ___.", "Your electricity bill measures energy in ___."]), a: "kilowatt-hour", options: ["kilowatt-hour", "watt", "joule", "ampere"] }) },
  { cls: 8, ch: "Electricity", subject: "physics", g: () => ({ q: pick(["The device that breaks a circuit on overload is a ___.", "Which safety device melts to break an overloaded circuit?"]), a: "fuse", options: ["fuse", "switch", "resistor", "battery"] }) },

  /* ---- Class 9 ---- */
  { cls: 9, ch: "Scalars & Vectors", subject: "physics", g: (): RawItem => { const [q0, t] = pick(VECTORS); return { q: pick([`${q0.charAt(0).toUpperCase() + q0.slice(1)} is a ___ quantity.`, `Is ${q0} a scalar or a vector?`]), a: t, options: ["scalar", "vector", "tensor", "unit"] }; } },
  { cls: 9, ch: "Equations of Motion", subject: "physics", g: () => { const a = rnd(2, 9), t = rnd(2, 6); return { q: `From rest, a = ${a} m/s² for ${t} s. Final velocity (v = u + at)?`, a: a * t, unit: " m/s" }; } },
  { cls: 9, ch: "Equations of Motion", subject: "physics", g: () => { const a = rnd(2, 10), t = pick([2, 4]); return { q: `From rest, a = ${a} m/s², t = ${t} s. Distance (s = ½at²)?`, a: 0.5 * a * t * t, unit: " m" }; } },
  { cls: 9, ch: "Laws of Motion", subject: "physics", g: () => ({ q: pick(["Newton's first law is also the law of ___.", "Which property is described by Newton's first law?"]), a: "inertia", options: ["inertia", "gravity", "momentum", "friction"] }) },
  { cls: 9, ch: "Laws of Motion", subject: "physics", g: () => { const m = rnd(2, 9), a = rnd(2, 9); return { q: `Force on a ${m} kg mass at ${a} m/s² (F = ma)?`, a: m * a, unit: " N" }; } },
  { cls: 9, ch: "Laws of Motion", subject: "physics", g: () => { const m = rnd(2, 12); return { q: `Weight of a ${m} kg mass (g = 10)?`, a: m * 10, unit: " N" }; } },
  { cls: 9, ch: "Laws of Motion", subject: "physics", g: () => ({ q: pick(["Action and reaction are equal and ___.", "Newton's third law: action and reaction are ___ in direction."]), a: "opposite", options: ["opposite", "equal", "smaller", "larger"] }) },
  { cls: 9, ch: "Fluids", subject: "physics", g: () => { const h = rnd(2, 9); return { q: `Pressure at depth ${h} m in water (ρ = 1000, g = 10)?`, a: h * 1000 * 10, unit: " Pa" }; } },
  { cls: 9, ch: "Fluids", subject: "physics", g: () => ({ q: pick(["The upward force on a body in a fluid is ___.", "Archimedes' principle deals with the ___ force."]), a: "buoyancy", options: ["buoyancy", "friction", "tension", "gravity"] }) },
  { cls: 9, ch: "Heat", subject: "physics", g: () => ({ q: pick(["Water has its maximum density at ___.", "Due to anomalous expansion, water is densest at ___."]), a: "4°C", options: ["4°C", "0°C", "10°C", "100°C"] }) },
  { cls: 9, ch: "Sound", subject: "physics", g: (): RawItem => { const [r, n] = pick(SOUND_RANGE); return { q: pick([`Sound ${r} is called ___.`, `Frequencies ${r} are ___.`]), a: n, options: ["infrasonic", "audible", "ultrasonic", "supersonic"] }; } },
  { cls: 9, ch: "Sound", subject: "physics", g: () => ({ q: pick(["Sound cannot travel through a ___.", "Through which can sound NOT travel?"]), a: "vacuum", options: ["vacuum", "solid", "liquid", "gas"] }) },
  { cls: 9, ch: "Electricity", subject: "physics", g: () => ({ q: pick(["Conventional current flows opposite to the flow of ___.", "Electrons flow opposite to ___ current."]), a: "electrons", options: ["electrons", "protons", "neutrons", "atoms"] }) },

  /* ---- Class 10: standard ---- */
  { cls: 10, ch: "Measurement", subject: "physics", g: (): RawItem => { const [q0, u] = pick(UNITS_ELEC); return { q: pick([`SI unit of ${q0}?`, `${q0.charAt(0).toUpperCase() + q0.slice(1)} is measured in ___?`]), a: u, options: optsFrom(u, UNIT_BANK) }; } },
  { cls: 10, ch: "Measurement", subject: "physics", g: (): RawItem => { const [q0, u] = pick(UNITS_MECH); return { q: pick([`SI unit of ${q0}?`, `The SI unit of ${q0} is ___.`]), a: u, options: optsFrom(u, UNIT_BANK) }; } },
  { cls: 10, ch: "Machines", subject: "physics", g: () => { const e = rnd(10, 40), L = e * pick([2, 3, 4, 5]); return { q: `A machine lifts a ${L} N load with ${e} N effort. Mechanical advantage?`, a: L / e }; } },
  { cls: 10, ch: "Machines", subject: "physics", g: () => { const ma = rnd(2, 4), vr = ma + rnd(1, 3); return { q: `MA = ${ma}, VR = ${vr}. Efficiency (%)?`, a: Math.round((ma / vr) * 100), unit: "%" }; } },
  { cls: 10, ch: "Machines", subject: "physics", g: () => ({ q: pick(["The MA of a single fixed pulley is ___.", "A single fixed pulley has a mechanical advantage of ___."]), a: "1", options: ["1", "2", "0", "4"] }) },
  { cls: 10, ch: "Lenses", subject: "physics", g: () => ({ q: pick(["A converging lens is ___.", "Which lens converges parallel light to a point?"]), a: "convex", options: ["convex", "concave", "plane", "cylindrical"] }) },
  { cls: 10, ch: "Lenses", subject: "physics", g: () => { const o = rnd(2, 6), m = rnd(2, 5); return { q: `Object ${o} cm tall, image ${o * m} cm tall. Magnification?`, a: m }; } },
  { cls: 10, ch: "Refraction", subject: "physics", g: () => ({ q: pick(["Beyond the critical angle, light undergoes total internal ___.", "Light fully reflects inside a denser medium beyond the critical angle: total internal ___."]), a: "reflection", options: ["reflection", "refraction", "dispersion", "absorption"] }) },
  { cls: 10, ch: "Light", subject: "physics", g: () => ({ q: pick(["The sky appears blue due to ___ of light.", "Why is the sky blue? Because of the ___ of light."]), a: "scattering", options: ["scattering", "reflection", "refraction", "dispersion"] }) },
  { cls: 10, ch: "Sound", subject: "physics", g: () => { const t = pick([2, 3, 4]); return { q: `An echo returns after ${t} s (speed 340 m/s). Distance to the wall?`, a: (340 * t) / 2, unit: " m" }; } },
  { cls: 10, ch: "Sound", subject: "physics", g: () => ({ q: pick(["Large vibration when forced at the natural frequency is ___.", "When the driving frequency equals the natural frequency, ___ occurs."]), a: "resonance", options: ["resonance", "echo", "damping", "interference"] }) },
  { cls: 10, ch: "Electricity", subject: "physics", g: () => { const i = rnd(1, 9), r = rnd(2, 9); return { q: `Ohm's law: ${i} A through ${r} Ω. Voltage?`, a: i * r, unit: " V" }; } },
  { cls: 10, ch: "Electricity", subject: "physics", g: () => { const r = pick([2, 4, 6, 8]); return { q: `Two ${r} Ω resistors in series. Total resistance?`, a: 2 * r, unit: " Ω" }; } },
  { cls: 10, ch: "Electricity", subject: "physics", g: () => { const r = pick([2, 4, 6, 8]); return { q: `Two ${r} Ω resistors in parallel. Total resistance?`, a: r / 2, unit: " Ω" }; } },
  { cls: 10, ch: "Heat", subject: "physics", g: () => ({ q: pick(["Heat to change state without a temperature change is ___ heat.", "The heat hidden in a change of state is ___ heat."]), a: "latent", options: ["latent", "specific", "sensible", "radiant"] }) },
  { cls: 10, ch: "Modern Physics", subject: "physics", g: () => ({ q: pick(["Splitting of a heavy nucleus is nuclear ___.", "A heavy nucleus breaking apart is nuclear ___."]), a: "fission", options: ["fission", "fusion", "decay", "ionisation"] }) },
  { cls: 10, ch: "Modern Physics", subject: "physics", g: () => ({ q: pick(["The Sun's energy comes from nuclear ___.", "Light nuclei joining to release energy is nuclear ___."]), a: "fusion", options: ["fusion", "fission", "burning", "friction"] }) },

  /* ---- Class 10: SERIOUS multi-step (Ace-level learning) ---- */
  { cls: 10, ch: "Free Fall", subject: "physics", g: () => { const [h, v] = pick(FREEFALL); return { q: `A body is dropped from ${h} m. Speed just before hitting the ground (g = 10, v = √(2gh))?`, a: v, unit: " m/s" }; } },
  { cls: 10, ch: "Power", subject: "physics", g: () => { const m = pick([50, 100, 200]), h = rnd(2, 10), t = pick([2, 5, 10]); return { q: `A pump raises ${m} kg through ${h} m in ${t} s (g = 10). Power output?`, a: (m * 10 * h) / t, unit: " W" }; } },
  { cls: 10, ch: "Circuits", subject: "physics", g: () => { const total = pick([10, 12, 15, 20]), i = pick([2, 3]), V = total * i, r1 = rnd(2, total - 2), r2 = total - r1; return { q: `A ${r1} Ω and a ${r2} Ω resistor in series across ${V} V. Current in the circuit?`, a: i, unit: " A" }; } },
  { cls: 10, ch: "Circuits", subject: "physics", g: () => { const r = pick([4, 6, 8]), V = pick([12, 24]); return { q: `Two ${r} Ω resistors in parallel across ${V} V. Total current drawn?`, a: V / (r / 2), unit: " A" }; } },
  { cls: 10, ch: "Calorimetry", subject: "physics", g: () => { const m = pick([1, 2, 5]), c = pick([4200, 900, 500]), dt = pick([5, 10, 20]); return { q: `Heat needed to raise ${m} kg (specific heat ${c} J/kg·°C) by ${dt} °C?`, a: m * c * dt, unit: " J" }; } },
  { cls: 10, ch: "Latent Heat", subject: "physics", g: () => { const mass = pick([5, 10, 20, 50]); return { q: `Heat to melt ${mass} g of ice at 0 °C (latent heat = 336 J/g)?`, a: 336 * mass, unit: " J" }; } },
  { cls: 10, ch: "Machines", subject: "physics", g: () => { const inp = pick([100, 200, 400, 500]), pct = pick([60, 75, 80]); return { q: `A machine gives ${(inp * pct) / 100} J of useful work from ${inp} J input. Efficiency?`, a: pct, unit: "%" }; } },
];

/* ===================== CHEMISTRY =====================
   Aligned to the Class 6–10 syllabus. Recall rotates phrasing + uses data
   tables; Class 9–10 add calculations (mass number, moles, °C→K, vapour
   density). All facts hand-verified. */

// First 20 elements: name, symbol, atomic number.
const ELEMENTS: [string, string, number][] = [
  ["Hydrogen", "H", 1], ["Helium", "He", 2], ["Lithium", "Li", 3], ["Beryllium", "Be", 4], ["Boron", "B", 5],
  ["Carbon", "C", 6], ["Nitrogen", "N", 7], ["Oxygen", "O", 8], ["Fluorine", "F", 9], ["Neon", "Ne", 10],
  ["Sodium", "Na", 11], ["Magnesium", "Mg", 12], ["Aluminium", "Al", 13], ["Silicon", "Si", 14], ["Phosphorus", "P", 15],
  ["Sulfur", "S", 16], ["Chlorine", "Cl", 17], ["Argon", "Ar", 18], ["Potassium", "K", 19], ["Calcium", "Ca", 20],
];
const SYM_BANK = ELEMENTS.map((e) => e[1]);
const NAME_BANK = ELEMENTS.map((e) => e[0]);
const Z_BANK = ELEMENTS.map((e) => String(e[2]));

const COMPOUNDS: [string, string][] = [
  ["Water", "H₂O"], ["Carbon dioxide", "CO₂"], ["Common salt", "NaCl"], ["Methane", "CH₄"],
  ["Ammonia", "NH₃"], ["Hydrochloric acid", "HCl"], ["Sulfuric acid", "H₂SO₄"], ["Glucose", "C₆H₁₂O₆"],
];
const MOLAR: [string, number][] = [["H₂O", 18], ["CO₂", 44], ["CH₄", 16], ["O₂", 32], ["NH₃", 17], ["NaCl", 58.5], ["CaCO₃", 100]];
const CLASSIFY: [string, string][] = [["Water", "Compound"], ["Oxygen", "Element"], ["Air", "Mixture"], ["Common salt", "Compound"], ["Iron", "Element"], ["Sea water", "Mixture"], ["Carbon dioxide", "Compound"]];
const PC_CHANGES: [string, string][] = [["Rusting of iron", "Chemical"], ["Melting of ice", "Physical"], ["Burning of paper", "Chemical"], ["Dissolving sugar in water", "Physical"], ["Cooking food", "Chemical"], ["Boiling water", "Physical"], ["Souring of milk", "Chemical"]];
const SEPARATION: [string, string][] = [["sand from water", "Filtration"], ["salt from sea water", "Evaporation"], ["dyes in ink", "Chromatography"], ["cream from milk", "Centrifugation"], ["iron filings from sand", "Magnetic separation"], ["two miscible liquids", "Distillation"]];
const SEP_BANK = SEPARATION.map((s) => s[1]);
const VALENCY: [string, number][] = [["Hydrogen", 1], ["Sodium", 1], ["Potassium", 1], ["Chlorine", 1], ["Oxygen", 2], ["Magnesium", 2], ["Calcium", 2], ["Nitrogen", 3], ["Aluminium", 3], ["Carbon", 4]];
const REACTIONS: [string, string][] = [["A + B → AB", "Combination"], ["AB → A + B", "Decomposition"], ["A + BC → AC + B", "Displacement"], ["AB + CD → AD + CB", "Double displacement"]];
const REACT_BANK = REACTIONS.map((r) => r[1]);
const ALLOYS: [string, string][] = [["Brass", "Copper + Zinc"], ["Bronze", "Copper + Tin"], ["Steel", "Iron + Carbon"], ["Solder", "Lead + Tin"]];
const ALLOY_BANK = ALLOYS.map((a) => a[1]);
const ORGANIC: [string, string][] = [["alkanes", "CₙH₂ₙ₊₂"], ["alkenes", "CₙH₂ₙ"], ["alkynes", "CₙH₂ₙ₋₂"]];
const ORG_BANK = ORGANIC.map((o) => o[1]);

export const CHEMISTRY: Gen[] = [
  /* ---- Class 6 ---- */
  { cls: 6, ch: "Matter", subject: "chemistry", g: () => ({ q: pick(["Anything that has mass and occupies space is called ___?", "What is anything that has mass and takes up space?"]), a: "Matter", options: ["Matter", "Energy", "Force", "Light"] }) },
  { cls: 6, ch: "Elements & Compounds", subject: "chemistry", g: (): RawItem => { const [x, t] = pick(CLASSIFY); return { q: pick([`Is ${x} an element, a compound or a mixture?`, `${x} is classified as a ___?`]), a: t, options: ["Element", "Compound", "Mixture", "Solution"] }; } },
  { cls: 6, ch: "Air", subject: "chemistry", g: () => ({ q: pick(["Which gas is needed for burning?", "Combustion needs which gas?"]), a: "Oxygen", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"] }) },
  { cls: 6, ch: "Water", subject: "chemistry", g: () => ({ q: pick(["Chemical formula of water?", "Water is written as ___?"]), a: "H₂O", options: ["H₂O", "HO₂", "H₂O₂", "OH"] }) },
  { cls: 6, ch: "Elements & Symbols", subject: "chemistry", g: (): RawItem => { const [name, sym] = pick(ELEMENTS); return { q: pick([`Chemical symbol of ${name}?`, `The symbol for ${name} is ___?`]), a: sym, options: optsFrom(sym, SYM_BANK) }; } },

  /* ---- Class 7 ---- */
  { cls: 7, ch: "Physical & Chemical Change", subject: "chemistry", g: (): RawItem => { const [x, t] = pick(PC_CHANGES); return { q: pick([`${x} is a ___ change.`, `Is "${x}" a physical or chemical change?`]), a: t, options: ["Physical", "Chemical", "Nuclear", "Biological"] }; } },
  { cls: 7, ch: "Separation", subject: "chemistry", g: (): RawItem => { const [x, t] = pick(SEPARATION); return { q: pick([`Best technique to separate ${x}?`, `How would you separate ${x}?`]), a: t, options: optsFrom(t, SEP_BANK) }; } },
  { cls: 7, ch: "Atomicity", subject: "chemistry", g: () => { const it = pick([["O₂", "diatomic"], ["He", "monoatomic"], ["O₃", "triatomic"], ["H₂", "diatomic"], ["N₂", "diatomic"]]); return { q: pick([`Atomicity of ${it[0]}?`, `${it[0]} is a ___ molecule.`]), a: it[1], options: ["monoatomic", "diatomic", "triatomic", "polyatomic"] }; } },
  { cls: 7, ch: "Valency", subject: "chemistry", g: (): RawItem => { const [name, v] = pick(VALENCY); return { q: pick([`Valency of ${name}?`, `The combining capacity (valency) of ${name} is ___?`]), a: String(v), options: ["1", "2", "3", "4"] }; } },
  { cls: 7, ch: "Elements & Symbols", subject: "chemistry", g: (): RawItem => { const [name, sym] = pick(ELEMENTS); return { q: pick([`Which element has the symbol ${sym}?`, `${sym} is the symbol for which element?`]), a: name, options: optsFrom(name, NAME_BANK) }; } },
  { cls: 7, ch: "Metals & Non-metals", subject: "chemistry", g: () => { const metal = pick(["Iron", "Copper", "Gold", "Zinc", "Sodium", "Aluminium"]); return { q: pick(["Which of these is a metal?", "Which one is a metal?"]), a: metal, options: shuffle([metal, ...shuffle(["Oxygen", "Sulfur", "Chlorine", "Nitrogen", "Carbon"]).slice(0, 3)]) }; } },
  { cls: 7, ch: "Corrosion", subject: "chemistry", g: () => ({ q: pick(["Rusting is the corrosion of which metal?", "Rust forms on which metal?"]), a: "Iron", options: ["Iron", "Gold", "Copper", "Aluminium"] }) },
  { cls: 7, ch: "Air", subject: "chemistry", g: () => ({ q: pick(["Most abundant gas in air?", "Which gas makes up most of the atmosphere?"]), a: "Nitrogen", options: ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"] }) },

  /* ---- Class 8 ---- */
  { cls: 8, ch: "Atomic Structure", subject: "chemistry", g: () => { const it = pick([["proton", "positive"], ["electron", "negative"], ["neutron", "neutral"]]); return { q: pick([`The charge on a ${it[0]} is ___?`, `A ${it[0]} carries a ___ charge.`]), a: it[1], options: ["positive", "negative", "neutral", "variable"] }; } },
  { cls: 8, ch: "Atomic Structure", subject: "chemistry", g: () => ({ q: pick(["Atomic number equals the number of ___?", "The number of protons in an atom is its ___?"]), a: "protons", options: ["protons", "neutrons", "electrons + neutrons", "shells"] }) },
  { cls: 8, ch: "Atomic Structure", subject: "chemistry", g: () => { const p = rnd(3, 20), n = rnd(3, 22); return { q: `An atom has ${p} protons and ${n} neutrons. Its mass number?`, a: p + n }; } },
  { cls: 8, ch: "Atomic Structure", subject: "chemistry", g: () => { const z = rnd(3, 18), a = z + rnd(2, 12); return { q: `Mass number ${a}, atomic number ${z}. Number of neutrons?`, a: a - z }; } },
  { cls: 8, ch: "Chemical Reactions", subject: "chemistry", g: (): RawItem => { const [pat, t] = pick(REACTIONS); return { q: pick([`"${pat}" is which type of reaction?`, `The reaction ${pat} is a ___ reaction.`]), a: t, options: optsFrom(t, REACT_BANK) }; } },
  { cls: 8, ch: "Chemical Reactions", subject: "chemistry", g: () => ({ q: pick(["A reaction that releases heat is ___?", "A reaction that gives out heat is called ___?"]), a: "exothermic", options: ["exothermic", "endothermic", "neutral", "catalytic"] }) },
  { cls: 8, ch: "Chemical Reactions", subject: "chemistry", g: () => ({ q: pick(["Acid + base → salt + water is a ___ reaction.", "What is the reaction of an acid with a base called?"]), a: "neutralisation", options: ["neutralisation", "combustion", "displacement", "decomposition"] }) },
  { cls: 8, ch: "Oxides", subject: "chemistry", g: () => ({ q: pick(["Metal oxides are generally ___?", "Oxides of metals are usually ___ in nature."]), a: "basic", options: ["basic", "acidic", "neutral", "amphoteric"] }) },
  { cls: 8, ch: "Oxides", subject: "chemistry", g: () => ({ q: pick(["Non-metal oxides are generally ___?", "Oxides of non-metals are usually ___ in nature."]), a: "acidic", options: ["acidic", "basic", "neutral", "amphoteric"] }) },
  { cls: 8, ch: "Reactivity", subject: "chemistry", g: () => ({ q: pick(["Most reactive of these metals?", "Which metal is the most reactive?"]), a: "Sodium", options: ["Sodium", "Iron", "Copper", "Gold"] }) },
  { cls: 8, ch: "Hydrogen", subject: "chemistry", g: () => ({ q: pick(["Gas released when a metal reacts with a dilute acid?", "Zinc + dilute acid gives which gas?"]), a: "Hydrogen", options: ["Hydrogen", "Oxygen", "Carbon dioxide", "Chlorine"] }) },
  { cls: 8, ch: "Carbon", subject: "chemistry", g: () => ({ q: pick(["The hardest natural substance?", "Which allotrope of carbon is the hardest?"]), a: "Diamond", options: ["Diamond", "Graphite", "Coke", "Charcoal"] }) },
  { cls: 8, ch: "Carbon", subject: "chemistry", g: () => ({ q: pick(["Allotrope of carbon that conducts electricity?", "Which form of carbon is used as a lubricant?"]), a: "Graphite", options: ["Graphite", "Diamond", "Coal", "Soot"] }) },
  { cls: 8, ch: "Carbon", subject: "chemistry", g: () => ({ q: pick(["Which gas turns lime water milky?", "Lime water turns milky with which gas?"]), a: "Carbon dioxide", options: ["Carbon dioxide", "Oxygen", "Hydrogen", "Nitrogen"] }) },
  { cls: 8, ch: "Compounds", subject: "chemistry", g: (): RawItem => { const [name, f] = pick(COMPOUNDS); return { q: pick([`Chemical formula of ${name}?`, `The formula for ${name} is ___?`]), a: f, options: optsFrom(f, COMPOUNDS.map((c) => c[1])) }; } },

  /* ---- Class 9 ---- */
  { cls: 9, ch: "Atomic Structure", subject: "chemistry", g: (): RawItem => { const [name, , z] = pick(ELEMENTS); return { q: pick([`Atomic number of ${name}?`, `How many protons does ${name} have?`]), a: String(z), options: optsFrom(String(z), Z_BANK) }; } },
  { cls: 9, ch: "Isotopes", subject: "chemistry", g: () => ({ q: pick(["Atoms of the same element with different mass numbers are ___?", "Same atomic number, different mass number — these are ___?"]), a: "isotopes", options: ["isotopes", "isobars", "ions", "allotropes"] }) },
  { cls: 9, ch: "Chemical Bonding", subject: "chemistry", g: () => ({ q: pick(["A bond formed by transfer of electrons is ___?", "Losing/gaining electrons forms a ___ bond."]), a: "electrovalent", options: ["electrovalent", "covalent", "metallic", "hydrogen"] }) },
  { cls: 9, ch: "Chemical Bonding", subject: "chemistry", g: () => ({ q: pick(["A bond formed by sharing electrons is ___?", "Sharing electrons forms a ___ bond."]), a: "covalent", options: ["covalent", "electrovalent", "metallic", "ionic"] }) },
  { cls: 9, ch: "Octet Rule", subject: "chemistry", g: () => ({ q: pick(["Atoms react to complete an outer shell of ___ electrons.", "The octet rule refers to ___ electrons in the outer shell."]), a: "8", options: ["8", "2", "4", "10"] }) },
  { cls: 9, ch: "Periodic Table", subject: "chemistry", g: () => ({ q: pick(["The modern periodic table is arranged by increasing ___?", "Elements in the modern periodic table are ordered by ___?"]), a: "atomic number", options: ["atomic number", "atomic mass", "valency", "density"] }) },
  { cls: 9, ch: "Periodic Table", subject: "chemistry", g: () => { const it = pick([["vertical columns", "groups"], ["horizontal rows", "periods"]]); return { q: `In the periodic table, the ${it[0]} are called ___?`, a: it[1], options: ["groups", "periods", "blocks", "series"] }; } },
  { cls: 9, ch: "Periodic Table", subject: "chemistry", g: () => { const it = pick([["Newlands", "Octaves"], ["Dobereiner", "Triads"]]); return { q: `${it[0]} is known for the Law of / grouping into ___?`, a: it[1], options: ["Octaves", "Triads", "Periods", "Groups"] }; } },
  { cls: 9, ch: "Mole Concept", subject: "chemistry", g: (): RawItem => { const [f, m] = pick(MOLAR); return { q: pick([`Molecular mass of ${f}? (approx)`, `Approximate molar mass of ${f}?`]), a: m }; } },
  { cls: 9, ch: "Gas Laws", subject: "chemistry", g: () => ({ q: pick(["At constant temperature, P ∝ 1/V is which law?", "Which law relates pressure and volume at constant temperature?"]), a: "Boyle's Law", options: ["Boyle's Law", "Charles's Law", "Avogadro's Law", "Gay-Lussac's Law"] }) },
  { cls: 9, ch: "Gas Laws", subject: "chemistry", g: () => ({ q: pick(["At constant pressure, V ∝ T is which law?", "Which law relates volume and temperature at constant pressure?"]), a: "Charles's Law", options: ["Charles's Law", "Boyle's Law", "Avogadro's Law", "Dalton's Law"] }) },
  { cls: 9, ch: "Gas Laws", subject: "chemistry", g: () => { const c = pick([0, 27, 100, 25, 50]); return { q: `Convert ${c}°C to Kelvin (K = °C + 273).`, a: c + 273, unit: " K" }; } },
  { cls: 9, ch: "Atmospheric Pollution", subject: "chemistry", g: () => ({ q: pick(["Which gas is chiefly responsible for acid rain?", "Acid rain is mainly caused by ___?"]), a: "Sulphur dioxide", options: ["Sulphur dioxide", "Oxygen", "Nitrogen", "Helium"] }) },

  /* ---- Class 10 ---- */
  { cls: 10, ch: "Acids & Bases", subject: "chemistry", g: () => ({ q: pick(["Acids produce which ion in water?", "In water, acids release ___ ions."]), a: "H⁺", options: ["H⁺", "OH⁻", "Na⁺", "Cl⁻"] }) },
  { cls: 10, ch: "Acids & Bases", subject: "chemistry", g: () => ({ q: pick(["Alkalis produce which ion in water?", "In water, bases release ___ ions."]), a: "OH⁻", options: ["OH⁻", "H⁺", "Cl⁻", "O²⁻"] }) },
  { cls: 10, ch: "Acids & Bases", subject: "chemistry", g: () => ({ q: pick(["An acidic solution has a pH ___ 7.", "The pH of an acid is ___ 7."]), a: "less than", options: ["less than", "greater than", "equal to", "double"] }) },
  { cls: 10, ch: "Acids & Bases", subject: "chemistry", g: () => ({ q: pick(["pH of a neutral solution?", "A neutral solution has a pH of ___?"]), a: "7", options: ["7", "0", "14", "1"] }) },
  { cls: 10, ch: "Mole Concept", subject: "chemistry", g: () => ({ q: pick(["Avogadro's number is approximately ___?", "One mole contains how many particles?"]), a: "6.022×10²³", options: ["6.022×10²³", "6.022×10²²", "3.011×10²³", "1.6×10⁻¹⁹"] }) },
  { cls: 10, ch: "Mole Concept", subject: "chemistry", g: () => ({ q: pick(["1 mole of any gas at STP occupies ___?", "The molar volume of a gas at STP is ___?"]), a: "22.4 L", options: ["22.4 L", "11.2 L", "1 L", "6.022 L"] }) },
  { cls: 10, ch: "Mole Concept", subject: "chemistry", g: () => { const mm = pick([18, 44, 16, 32]), mol = rnd(2, 5); return { q: `Moles in ${mol * mm} g of a substance (molar mass ${mm})?`, a: mol }; } },
  { cls: 10, ch: "Mole Concept", subject: "chemistry", g: () => { const vd = pick([8, 16, 22, 32]); return { q: `Vapour density of a gas is ${vd}. Its molecular mass? (M = 2 × V.D.)`, a: 2 * vd }; } },
  { cls: 10, ch: "Electrolysis", subject: "chemistry", g: () => { const it = pick([["negative electrode", "Cathode"], ["positive electrode", "Anode"], ["positively charged ion", "Cation"], ["negatively charged ion", "Anion"]]); return { q: `In electrolysis, the ${it[0]} is the ___?`, a: it[1], options: ["Cathode", "Anode", "Cation", "Anion"] }; } },
  { cls: 10, ch: "Electrolysis", subject: "chemistry", g: () => { const it = pick([["Loss", "oxidation"], ["Gain", "reduction"]]); return { q: `${it[0]} of electrons is called ___?`, a: it[1], options: ["oxidation", "reduction", "neutralisation", "ionisation"] }; } },
  { cls: 10, ch: "Metallurgy", subject: "chemistry", g: () => ({ q: pick(["The chief ore of aluminium is ___?", "Aluminium is mainly extracted from ___?"]), a: "Bauxite", options: ["Bauxite", "Haematite", "Galena", "Calamine"] }) },
  { cls: 10, ch: "Metallurgy", subject: "chemistry", g: (): RawItem => { const [name, comp] = pick(ALLOYS); return { q: pick([`${name} is an alloy of ___?`, `What are the main metals in ${name}?`]), a: comp, options: optsFrom(comp, ALLOY_BANK) }; } },
  { cls: 10, ch: "Study of Compounds", subject: "chemistry", g: () => ({ q: pick(["Haber's process manufactures ___?", "Which gas is made industrially by Haber's process?"]), a: "Ammonia", options: ["Ammonia", "Sulphuric acid", "Nitric acid", "Hydrogen chloride"] }) },
  { cls: 10, ch: "Study of Compounds", subject: "chemistry", g: () => ({ q: pick(["The Contact process manufactures ___?", "Which acid is made by the Contact process?"]), a: "Sulphuric acid", options: ["Sulphuric acid", "Nitric acid", "Ammonia", "Hydrochloric acid"] }) },
  { cls: 10, ch: "Study of Compounds", subject: "chemistry", g: () => ({ q: pick(["Concentrated sulphuric acid acts as a ___ agent (removes water).", "Conc. H₂SO₄ removing water from sugar shows it is a ___ agent."]), a: "dehydrating", options: ["dehydrating", "reducing", "bleaching", "neutralising"] }) },
  { cls: 10, ch: "Organic Chemistry", subject: "chemistry", g: (): RawItem => { const [name, f] = pick(ORGANIC); return { q: pick([`General formula of ${name}?`, `${name.charAt(0).toUpperCase() + name.slice(1)} have the general formula ___?`]), a: f, options: optsFrom(f, [...ORG_BANK, "CₙH₂ₙ₊₁"]) }; } },
  { cls: 10, ch: "Organic Chemistry", subject: "chemistry", g: () => ({ q: pick(["Compounds with the same molecular formula but different structures are ___?", "Same formula, different structure — these are ___?"]), a: "isomers", options: ["isomers", "isotopes", "isobars", "allotropes"] }) },
  { cls: 10, ch: "Organic Chemistry", subject: "chemistry", g: () => ({ q: pick(["The simplest alkane is ___?", "Which is the first member of the alkane series?"]), a: "Methane", options: ["Methane", "Ethane", "Ethene", "Propane"] }) },
];
