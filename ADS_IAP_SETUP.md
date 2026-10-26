# GyanBlitz — Rewarded Ads & Coin Top-ups (drop-in guide)

**Status: the in-app UI is live; the real ad/payment SDKs are not.** Do this at
the **EAS dev-build / pre-launch** stage (they don't run in Expo Go).

What already works today (Expo Go):
- The **Store screen** (tap the coin balance on Home).
- **Watch ad → +50 ₵** — calls `claim_ad_reward()` (server-capped at 5/day). In
  Expo Go it grants instantly with no real ad.
- **Coin packs** show prices but say "Coming at launch."

What this guide adds at build time:
1. A **real rewarded ad** before `claim_ad_reward()` grants coins.
2. **Real coin purchases** (in-app purchases) that credit coins after payment.

---

## A. Rewarded ads (Google AdMob)

**Prereqs:** EAS dev build · an AdMob account · ad unit IDs (iOS + Android).

1. Install: `npx expo install react-native-google-mobile-ads`
2. In `app.json` add the plugin + your AdMob app IDs:
   ```json
   "plugins": [["react-native-google-mobile-ads", {
     "androidAppId": "ca-app-pub-XXX~XXX",
     "iosAppId": "ca-app-pub-XXX~XXX"
   }]]
   ```
3. Create a **Rewarded** ad unit in AdMob for each platform.
4. In `StoreScreen.tsx`, replace the `watchAd` body so the ad plays first, then
   reward on completion:
   ```ts
   import { RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";
   const adUnitId = __DEV__ ? TestIds.REWARDED : "ca-app-pub-XXX/XXX";
   // load the ad, show it, and on RewardedAdEventType.EARNED_REWARD call claimAd()
   ```
   Keep `claimAd()` (the server cap) as the source of truth for the coins.

**Important — kids & ads:** GyanBlitz's audience is minors. In AdMob, tag the
app **child-directed / for families**, request **non-personalised** ads, and
ensure no gambling/alcohol categories. (COPPA / Google Families policy.)

---

## B. Coin purchases (IAP via RevenueCat)

**Prereqs:** EAS dev build · Apple Developer + Google Play accounts · the app
registered in App Store Connect & Play Console · a RevenueCat account (free).

1. Install: `npx expo install react-native-purchases`
2. In **App Store Connect** and **Play Console**, create consumable IAP products
   matching `PACKS` in `StoreScreen.tsx` (e.g. `coins_500`, `coins_1200`, …).
3. In **RevenueCat**, add the apps + products; copy the public SDK keys.
4. Initialise RevenueCat on launch (`Purchases.configure({ apiKey })`).
5. In `StoreScreen.tsx`, replace `buy()` to call `Purchases.purchaseProduct(id)`,
   and show **`product.priceString`** for each pack instead of the placeholder
   `priceAt(i)` — `priceString` is already localized to the user's store
   currency (₹ / $ / € …), so global pricing is automatic.
6. **Credit coins server-side, not on the client.** Set up a **RevenueCat
   webhook → a Supabase Edge Function** that verifies the purchase and adds the
   coins to `profiles.coins` (never trust the client for paid coins). I'll write
   that Edge Function when we get here.

**Store cut:** Apple/Google take 15–30% of each purchase (15% under the
small-business programs you'll qualify for).

---

## What changes in the app
- `app.json`: AdMob plugin + IDs.
- `StoreScreen.tsx`: real ad in `watchAd`; real purchase in `buy`.
- New: a Supabase Edge Function for the RevenueCat purchase webhook.
- No change to `claim_ad_reward` (server cap stays) or the Store UI layout.
