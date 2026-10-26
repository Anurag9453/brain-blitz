// Generates a self-contained, responsive, searchable HTML review sheet for all 12,000+ GK questions.
// Run: cd app && npx tsx scripts/export-review-html.ts

declare const require: any;
declare const __dirname: string;
const fs = require("fs");
const path = require("path");
import { GK_DATA } from "../src/engine/gk/data";
import { fill, GK_LABEL, qkey } from "../src/engine/gk/build";
import { setSeed, clearSeed, shuffle } from "../src/engine/rng";

interface Item {
  ref: string;
  cat: string;
  topic: string;
  band: number;
  q: string;
  a: string;
  wrong: string[];
}

const items: Item[] = [];
const partNo = new Map<string, number>();
const seen = new Set<string>();
setSeed(20261026);

for (const d of GK_DATA) {
  const p = (partNo.get(d.cat) ?? 0) + 1;
  partNo.set(d.cat, p);
  const cat = GK_LABEL[d.cat];

  for (const [tag, list] of Object.entries(d.mcq)) {
    list.forEach(([q, a, w1, w2, w3, cls], i) => {
      const k = qkey(q, a);
      if (seen.has(k)) return;
      seen.add(k);
      items.push({
        ref: `${d.cat}/part${p}/mcq/${tag}#${i + 1}`,
        cat,
        topic: tag,
        band: cls,
        q,
        a,
        wrong: [w1, w2, w3],
      });
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
        const wrong = isYear
          ? ["Nearby year 1", "Nearby year 2", "Nearby year 3"]
          : shuffle(pool.filter((x) => !bad.has(x))).slice(0, 3);
        const phrasings = ask.q.map((q) => fill(q, v));
        items.push({
          ref: `${d.cat}/part${p}/table/${t.topic}/row${ri + 1}/ask${ai + 1}`,
          cat,
          topic: t.topic,
          band: t.rows[ri][t.rows[ri].length - 1] as number,
          q: phrasings[0],
          a: v[ask.to],
          wrong,
        });
      });
    });
  }
}
clearSeed();

console.log(`Exporting ${items.length} GK questions to interactive HTML...`);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GyanBlitz - GK Question Bank Review Sheet (${items.length} questions)</title>
  <style>
    :root {
      --bg: #0F0A1C;
      --card: #18122B;
      --border: #2C2250;
      --text: #F1ECFF;
      --muted: #A99FD0;
      --accent: #FFC53D;
      --correct: #3DDC97;
      --wrong: #FF6B6B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
    }
    .header {
      max-width: 1300px;
      margin: 0 auto 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    h1 { font-size: 24px; color: var(--accent); }
    .controls {
      max-width: 1300px;
      margin: 0 auto 20px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    input, select {
      background: #251B42;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text);
      font-size: 14px;
      outline: none;
    }
    input { flex: 1; min-width: 240px; }
    .stats {
      font-size: 14px;
      color: var(--muted);
      margin-left: auto;
      font-weight: 700;
    }
    .table-wrap {
      max-width: 1300px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      background: #251B42;
      color: var(--accent);
      padding: 12px 14px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 12px 14px;
      font-size: 14px;
      border-bottom: 1px solid rgba(44, 34, 80, 0.6);
      vertical-align: top;
    }
    tr:hover { background: rgba(255, 197, 61, 0.04); }
    .cat-badge {
      display: inline-block;
      background: #2C2250;
      color: var(--accent);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .cls-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      background: #3A2F66;
    }
    .c6 { background: #1B9E6A; color: #fff; }
    .c7 { background: #2B7A78; color: #fff; }
    .c8 { background: #4A3E72; color: #fff; }
    .c9 { background: #8E44AD; color: #fff; }
    .c10 { background: #D35400; color: #fff; }
    .ans { color: var(--correct); font-weight: 700; }
    .wrong { color: var(--muted); font-size: 13px; }
    .ref { font-family: monospace; font-size: 11px; color: var(--muted); }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>GyanBlitz — GK Question Bank Review Sheet</h1>
      <p style="color:var(--muted); font-size:14px; margin-top:4px;">All ${items.length} verified general knowledge questions for human review and curriculum audit.</p>
    </div>
  </div>

  <div class="controls">
    <input type="text" id="search" placeholder="Search keyword, question, or answer (e.g. Harappa, Tiger, 1947)..." oninput="filter()">
    <select id="cat" onchange="filter()">
      <option value="">All Categories</option>
      ${[...new Set(items.map((i) => i.cat))].map((c) => `<option value="${c}">${c}</option>`).join("")}
    </select>
    <select id="band" onchange="filter()">
      <option value="">All Classes</option>
      <option value="6">Class 6 (Warm-up)</option>
      <option value="7">Class 7 (Easy)</option>
      <option value="8">Class 8 (Medium)</option>
      <option value="9">Class 9 (Hard)</option>
      <option value="10">Class 10 (Master)</option>
    </select>
    <div class="stats" id="count">Showing ${items.length} of ${items.length}</div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width: 140px;">Category</th>
          <th style="width: 60px;">Class</th>
          <th>Question</th>
          <th style="width: 180px;">Correct Answer</th>
          <th style="width: 280px;">Wrong Options (Sample)</th>
          <th style="width: 180px;">Source Reference</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>

  <script>
    const data = ${JSON.stringify(items)};
    const tbody = document.getElementById('tbody');
    const searchInput = document.getElementById('search');
    const catSelect = document.getElementById('cat');
    const bandSelect = document.getElementById('band');
    const countDisplay = document.getElementById('count');

    function render(rows) {
      countDisplay.textContent = 'Showing ' + rows.length.toLocaleString() + ' of ' + data.length.toLocaleString();
      let html = '';
      const limit = Math.min(rows.length, 500); // virtual render top 500 for fast responsiveness
      for (let i = 0; i < limit; i++) {
        const r = rows[i];
        html += '<tr>' +
          '<td><span class="cat-badge">' + r.cat + '</span><br><span style="font-size:11px;color:var(--muted)">' + r.topic + '</span></td>' +
          '<td><span class="cls-badge c' + r.band + '">C' + r.band + '</span></td>' +
          '<td><strong>' + r.q + '</strong></td>' +
          '<td class="ans">✓ ' + r.a + '</td>' +
          '<td class="wrong">' + r.wrong.join(' &bull; ') + '</td>' +
          '<td class="ref">' + r.ref + '</td>' +
          '</tr>';
      }
      if (rows.length > 500) {
        html += '<tr><td colspan="6" style="text-align:center;color:var(--accent);padding:16px;">... and ' + (rows.length - 500).toLocaleString() + ' more matches. Refine your search above.</td></tr>';
      }
      tbody.innerHTML = html;
    }

    function filter() {
      const q = searchInput.value.toLowerCase().trim();
      const c = catSelect.value;
      const b = bandSelect.value;

      const filtered = data.filter(item => {
        if (c && item.cat !== c) return false;
        if (b && item.band !== +b) return false;
        if (q && !(item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q))) {
          return false;
        }
        return true;
      });
      render(filtered);
    }

    render(data);
  </script>
</body>
</html>`;

const outPath = path.resolve(__dirname, "../../audit/gk-review.html");
fs.writeFileSync(outPath, html, "utf-8");
console.log(`Saved interactive review sheet to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
