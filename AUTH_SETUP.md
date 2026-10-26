# GyanBlitz — Google & Apple Sign-In (drop-in guide)

**Status: not active yet.** The app currently uses name-based sign-in on a
device-persistent anonymous account. Do this when you move to an **EAS dev
build** (which you need for the app stores anyway). Native Google/Apple sign-in
**does not work in Expo Go** — it needs a custom build.

**Prerequisites**
- An **EAS dev build** (`eas build --profile development`) or production build — not Expo Go.
- **Apple Developer Program** ($99/yr) — required for Apple sign-in (iOS only).
- A **Google Cloud** project (free) for Google OAuth credentials.

---

## Step 1 — Install the packages

```bash
cd app
npx expo install @react-native-google-signin/google-signin expo-apple-authentication
```

Add the plugins in `app/app.json` (inside `expo.plugins`):

```json
"plugins": [
  "expo-asset",
  "expo-audio",
  "@react-native-google-signin/google-signin",
  "expo-apple-authentication"
]
```

Apple also needs the entitlement — add to `app/app.json`:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.anurag.gyanblitz",
  "usesAppleSignIn": true
}
```

---

## Step 2 — Google Cloud credentials

1. console.cloud.google.com → create/select a project.
2. **APIs & Services → Credentials → Create OAuth client ID**, make THREE:
   - **Web** client → used by Supabase + as `webClientId` in the app.
   - **iOS** client (bundle id `com.anurag.gyanblitz`) → `iosClientId`.
   - **Android** client (package `com.anurag.gyanblitz` + your SHA-1 from EAS).
3. Note the **Web client ID + secret** (for Supabase) and the **iOS/Web client IDs** (for the app).

## Step 3 — Apple credentials

1. developer.apple.com → **Certificates, Identifiers & Profiles**.
2. Enable **Sign in with Apple** on your App ID (`com.anurag.gyanblitz`).
3. Create a **Services ID** + a **Sign in with Apple key** (.p8) — Supabase needs these.

## Step 4 — Supabase provider config

Dashboard → **Authentication → Providers**:
- **Google**: enable → paste the **Web client ID + secret**. Add the iOS/Web client IDs to the "Authorized Client IDs" list (for native id-token sign-in).
- **Apple**: enable → paste the **Services ID, Team ID, Key ID, and .p8 key**.

> Supabase dashboard fields change over time — follow the official pages:
> https://supabase.com/docs/guides/auth/social-login/auth-google
> https://supabase.com/docs/guides/auth/social-login/auth-apple

---

## Step 5 — App code

Create `app/src/lib/socialAuth.ts`:

```ts
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "./supabase";

GoogleSignin.configure({
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
});

export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  const idToken = res.data?.idToken;            // @react-native-google-signin v13+
  if (!idToken) throw new Error("No Google ID token");
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
  if (error) throw error;
}

export async function signInWithApple(): Promise<void> {
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!cred.identityToken) throw new Error("No Apple identity token");
  const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
  if (error) throw error;
}

export const appleAuthAvailable = AppleAuthentication.isAvailableAsync; // iOS only
```

Add the buttons to `OnboardingScreen.tsx` (below the name field) — Apple's
button is required to use their component on iOS:

```tsx
import * as AppleAuthentication from "expo-apple-authentication";
import { signInWithGoogle, signInWithApple } from "../lib/socialAuth";
// ...
<Pressable style={styles.googleBtn} onPress={async () => { try { await signInWithGoogle(); } catch {} }}>
  <Text style={styles.googleText}>Continue with Google</Text>
</Pressable>

{Platform.OS === "ios" && (
  <AppleAuthentication.AppleAuthenticationButton
    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
    cornerRadius={16}
    style={{ width: "100%", height: 52 }}
    onPress={async () => { try { await signInWithApple(); } catch {} }}
  />
)}
```

When sign-in succeeds, `supabase.auth` swaps to the permanent account and our
existing `init()` / `onAuthStateChange` reloads the profile. Keep the **name
field as a fallback** ("Skip / play as guest") so onboarding never blocks.

---

## Step 6 — Preserve anonymous progress (account linking)

Players who started anonymously have coins/stars on the anon account. To carry
that over instead of creating a fresh account, **link** the identity rather than
plain sign-in. This flow has specifics that change between Supabase versions —
follow the current doc and we'll finalise it together at build time:

https://supabase.com/docs/guides/auth/auth-anonymous (see "link an identity")

If carrying over guest progress isn't important at launch, plain
`signInWithIdToken` (above) is fine — the player just starts fresh on the
permanent account.

---

## Step 7 — Test

- Build & install the dev build: `eas build --profile development` → install on a real device.
- Google: works on iOS + Android. Apple: iOS only.
- Verify a row appears in Supabase **Authentication → Users** with the provider, and the profile loads.

## What changes in the app
- `OnboardingScreen`: add the two buttons (keep name entry as guest fallback).
- New file `src/lib/socialAuth.ts`.
- `app.json`: plugins + `usesAppleSignIn`.
- No database changes — `handle_new_user` already creates a profile for any new auth user.
