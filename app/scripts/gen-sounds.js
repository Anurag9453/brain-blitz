// Synthesises GyanBlitz's sound effects as small mono 16-bit WAV files.
// No external/licensed assets — run with: node scripts/gen-sounds.js
const fs = require("fs");
const path = require("path");

const SR = 44100;
const OUT = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(OUT, { recursive: true });

function writeWav(file, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// A single note with a soft attack + exponential decay envelope.
function note(freq, dur, vol = 0.5) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const attack = SR * 0.005;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp((-3.2 * t) / dur) * Math.min(1, i / attack);
    out[i] = Math.sin(2 * Math.PI * freq * t) * vol * env;
  }
  return out;
}

// Concatenate notes into one buffer: [{ f, d, v }]
function seq(notes) {
  const parts = notes.map((nt) => note(nt.f, nt.d, nt.v ?? 0.5));
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const SOUNDS = {
  correct: seq([{ f: 660, d: 0.09 }, { f: 990, d: 0.14 }]), // bright two-tone up
  wrong: seq([{ f: 300, d: 0.12, v: 0.5 }, { f: 196, d: 0.2, v: 0.5 }]), // low thunk down
  tick: note(1500, 0.05, 0.32), // countdown blip
  go: note(880, 0.2, 0.5), // GO!
  coin: seq([{ f: 1318, d: 0.06 }, { f: 1760, d: 0.13 }]), // coin ping
  win: seq([{ f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 784, d: 0.1 }, { f: 1047, d: 0.24 }]), // fanfare
  tap: note(600, 0.03, 0.22), // soft UI click
};

for (const [name, samples] of Object.entries(SOUNDS)) {
  const file = path.join(OUT, `${name}.wav`);
  writeWav(file, samples);
  console.log(`✓ ${name}.wav (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
}
console.log(`\nWrote ${Object.keys(SOUNDS).length} sounds to ${OUT}`);
