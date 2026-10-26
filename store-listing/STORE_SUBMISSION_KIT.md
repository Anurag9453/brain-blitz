# GyanBlitz — App Store & Google Play Submission Kit

This document contains ready-to-paste metadata, descriptions, compliance questionnaire answers, and build commands for submitting **GyanBlitz** (`com.anurag.gyanblitz`) to Google Play Console and Apple App Store Connect.

---

## 1. Store Metadata & Copy

- **App Name:** GyanBlitz: Maths, Science & GK Quiz
- **Short Title (App Store):** GyanBlitz
- **Subtitle (App Store - 30 chars):** Fast Maths, Science & GK Duels
- **Bundle ID / Package Name:** `com.anurag.gyanblitz`
- **Primary Category:** Games → Trivia / Educational
- **Secondary Category:** Education
- **Support Email:** `support@gyanblitz.app`
- **Privacy Policy URL:** `https://anurag9453.github.io/brain-blitz/privacy-policy.html`
- **Terms of Service URL:** `https://anurag9453.github.io/brain-blitz/terms-of-service.html`

### Short Description (Google Play — Max 80 chars)
```text
Fast-paced mental maths, physics, chemistry & GK battles for Classes 6 to 10!
```

### Full Description (Google Play & App Store — < 4,000 chars)
```text
Sharpen your mind and race the clock in GyanBlitz — the ultimate mental Maths, Physics, Chemistry, and General Knowledge arcade quiz game designed around school curriculum standards (Classes 6–10)!

Whether you're warming up for exams, challenging friends in real-time rooms, or climbing the weekly leagues, GyanBlitz turns speed calculation and general knowledge into an electrifying 60-second sport.

⚡ FOUR CORE SUBJECTS + MIXED MODE
• Mental Maths: Arithmetic, fractions, percentages, algebra, geometry, mensuration, exponents, and word problems.
• Physics: Motion, force, work & energy, light, electricity, sound, and unit conversions.
• Chemistry: Elements, periodic table, acids & bases, chemical reactions, and everyday science.
• General Knowledge (GK): 12,000+ curated questions across Indian History, Geography, Polity, Economy, Science & Tech, Culture, World Affairs, and Sports.

🎮 FIVE WAYS TO PLAY
1. Global Arena: Compete in 50-player brackets across 6 progressive difficulty tiers (Rookie to Elite) to earn mastery stars.
2. vs Computer: Go head-to-head in timed 1–5 minute duels against calibrated AI bots.
3. Play with Friends: Create a private 4-player room, share a 6-character code, and battle on the exact same question set in real time!
4. Practice Mode: Free 1-minute warm-up sprints at any level — zero entry fee.
5. Marathon Mode: 10-minute endurance runs featuring multi-step word problems.

🏆 PROGRESSION, LEAGUES & CUSTOMISATION
• Weekly Leagues: Climb from Bronze to Legend tier every week.
• Win Streaks & XP: Chain victories for up to 3× streak bonuses and level up your profile.
• Season Pass & Locker: Unlock vibrant dark and light arcade color themes.
• Post-Match Review: Inspect every question you answered or skipped after each round, and flag any question with one tap.

🛡️ SAFE, PRIVACY-FIRST & STUDENT FRIENDLY
• Instant Play: Start playing immediately with just a nickname — no phone number or personal details required.
• Optional Cloud Save: Link an email in Account Settings anytime to back up your progress across devices.
• Purely Virtual Coins: In-game coins (₵) are strictly virtual points used to unlock higher arenas and cosmetic themes. They have no real-world monetary value and cannot be cashed out.
```

### App Store Keywords (100 chars max)
```text
maths,mental math,quiz,gk,science,physics,chemistry,ncert,brain training,trivia,class 6,class 10
```

---

## 2. Google Play Data Safety Form Answers

| Question / Section | Answer to Select |
| :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **Yes** |
| **Is all of the user data collected by your app encrypted in transit?** | **Yes** (HTTPS / TLS 1.3 via Supabase) |
| **Do you provide a way for users to request that their data is deleted?** | **Yes** (In-app via Profile → Delete Account, and via email link in Privacy Policy) |
| **Personal Info → Email address** | **Collected (Optional)** — Used only for Account Management when user optionally links an email to save progress. Not shared with third parties. |
| **Financial Info → Purchase history** | **Collected** — Order ID and pack purchased when buying optional coin packs via Razorpay. Card/UPI details are never seen or stored by the app. |
| **App Activity → App interactions / Gameplay** | **Collected** — Match scores, XP, and level stars for leaderboards and progression. |
| **App Info and Performance → Crash logs** | **Collected** — Anonymous crash stack traces (`app_logs`) used solely for stability and bug fixing. |
| **Location / Contacts / Photos / Microphone** | **No** (Not collected or requested) |

---

## 3. Content Rating (IARC / App Store Age Rating)

- **Violence / Blood / Gore / Sexual Content / Profanity / Drugs:** **None (No)**
- **Simulated Gambling:** **No** *(In-game coins are virtual arcade points for level entry and cosmetic skins; they cannot be cashed out, transferred, or redeemed for anything of monetary value).*
- **Unrestricted Web Access:** **No**
- **User-Generated Content / Open Chat:** **No** *(Players only see nicknames in leaderboards and private code rooms; there is no free-text chat).*
- **Recommended Age Rating:** **Everyone / 4+ (or 9+ / 12+ Educational)**

---

## 4. App Review Notes (Copy-Paste for Apple / Google Reviewers)

```text
Thank you for reviewing GyanBlitz!

1. Instant Access (No Login Wall):
   - On first launch, enter any nickname (2+ characters), check the consent box, and tap "Start Playing".
   - No login is required to play all game modes (Arena, vs Computer, Practice, Marathon, Play with Friends).

2. Optional Account Linking & Mandatory In-App Deletion:
   - Tap the "Guest" pill in the top-left of the Home screen to open the Account modal.
   - Users can optionally link an email/password, sign in, or permanently delete their account via the "Delete Account" button at the bottom of the modal.

3. Virtual Currency Note:
   - Coins (₵) are purely virtual in-game points earned via Daily Rewards, matches, and optional coin packs. They unlock higher difficulty levels and cosmetic themes and cannot be cashed out or redeemed.
```

---

## 5. Native Build & Submission Commands (EAS CLI)

Run these commands from the `/app` directory once your Apple Developer ($99/yr) or Google Play Console ($25) account is active:

```bash
# 1. Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Configure project ID
cd app
eas build:configure

# 4. Build an installable Android APK for direct phone testing
eas build --platform android --profile preview

# 5. Build production bundles for Google Play (AAB) and Apple App Store (IPA)
eas build --platform all --profile production

# 6. Submit to stores
eas submit --platform android
eas submit --platform ios
```
