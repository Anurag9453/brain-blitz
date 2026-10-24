# MathBlitz 🧮

A fast, competitive **mental-maths arcade** for students (Classes 6–10). Timed
matches, an unlockable level ladder, star ratings, and a coin economy — built
for **iOS + Android** from one codebase, with a **Supabase** backend.

> Status: working foundation (Blitz mode + economy + leaderboard). The web
> prototype this grew from validated the gameplay; this repo is the real app.

---

## How it works

- **Question engine** — 78 procedural generators across Classes 6–10. Each is a
  *format* with randomised digits, so questions never repeat and answers are
  always correct (computed in code, not by AI). Verified by `app/test`.
- **Levels** — a 6-level ladder (Rookie → Elite). Each level draws from harder
  class bands, has its own timer (2:00 → 3:30), entry fee, and prizes. Earn ≥1
  of 3 ⭐ to unlock the next.
- **Server-authoritative economy** — coins live in Postgres and are mutated
  **only** by `SECURITY DEFINER` functions. The client cannot edit its balance.
  The match **score is recomputed on the server** from correct/wrong counts.
- **Leaderboard** — each match ranks you against bots (generated server-side).
  A daily real-player leaderboard function is included, ready for when you have
  players.

```
Game/
├── app/                      Expo (React Native + TypeScript) app
│   ├── src/engine/           the 78-generator question engine (pure TS)
│   ├── src/lib/              supabase client + data layer
│   ├── src/state/            zustand store (game flow)
│   ├── src/screens/          Home (levels) · Match · Result
│   └── test/                 engine validation (234k samples)
└── supabase/
    ├── migrations/0001_init.sql   schema · RLS · economy functions
    └── config.toml
```

---

## 1. Backend setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. **Enable anonymous sign-ins**: Dashboard → Authentication → Providers →
   *Anonymous* → enable. (Players get an account instantly; we add email/social
   later.)
3. **Apply the schema.** Either:
   - **SQL Editor** (quickest): paste the contents of
     `supabase/migrations/0001_init.sql` and run it; **or**
   - **CLI**: `supabase link --project-ref <ref>` then `supabase db push`.
4. Grab your **Project URL** and **anon/publishable key** from
   Project Settings → Data API / API Keys.

## 2. App setup (Expo)

```bash
cd app
npm install
npx expo install --fix      # aligns native module versions to the Expo SDK
cp .env.example .env         # then paste your Supabase URL + anon key
npm start                    # opens Expo Dev Tools
```

Install **Expo Go** on your phone, scan the QR code, and play. (Or press `i` /
`a` for the iOS / Android simulator.)

## 3. Verify the engine

```bash
cd app
npm test        # runs 234k generated questions through correctness checks
npm run typecheck
```

---

## Security notes

- RLS is on for every table; reads are restricted to the owner via
  `auth.uid()`. Coins have **no client write path** (column-level grants).
- Economy + scoring run server-side, so coin/score tampering via the API is
  blocked.
- **Known v2 hardening:** the client still reports `correct`/`wrong` counts. A
  determined cheater could inflate them. True anti-cheat = the server serves and
  validates each question/answer with timing. The RPC boundary is designed so we
  can move question validation server-side without changing the client flow.

## Roadmap

- [ ] **Marathon mode** — 10-min, word problems (the 9 `w:true` generators).
- [ ] **Real leaderboards + daily/weekly tournaments** (function already stubbed).
- [ ] **Game juice** — sound, coin animations, streak combos.
- [ ] **Account upgrade** — link email/social to an anonymous account.
- [ ] **AI Format Factory** — offline generation of new formats, solver-verified.

## Tuning

Level fees, prizes, timers, and star thresholds live in two places that must
stay in sync: `supabase/migrations/0001_init.sql` (source of truth, used by the
server) and `app/src/engine/levels.ts` (client fallback/display).
