import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

// Allow auth redirects to complete in WebBrowser
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "605000000000-placeholder.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

let isGoogleConfigured = false;

export function configureGoogleSignIn(): void {
  if (isGoogleConfigured) return;
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
    });
    isGoogleConfigured = true;
  } catch (err) {
    console.warn("GoogleSignin.configure warning:", err);
  }
}

/**
 * Sign in or link with Google.
 * Attempts native Google Play Services sign-in on native builds;
 * gracefully falls back to browser OAuth session if running in Expo Go.
 */
export async function signInWithGoogle(): Promise<{ ok: boolean; message?: string }> {
  try {
    configureGoogleSignIn();

    // 1. Attempt Native Google Sign-In (EAS development / production build)
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signinRes = await GoogleSignin.signIn();
      const idToken = signinRes.data?.idToken;

      if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        return { ok: true };
      }
    } catch (nativeErr: any) {
      // If native module is missing (e.g. Expo Go) or cancelled, fallback to browser OAuth
      const msg = nativeErr?.message || "";
      if (msg.includes("RNGoogleSignin") || msg.includes("not found") || msg.includes("DEVELOPER_ERROR")) {
        console.log("Native Google Sign-In not available, falling back to Browser OAuth...");
      } else if (msg.includes("SIGN_IN_CANCELLED") || msg.includes("cancelled")) {
        return { ok: false, message: "Sign-in cancelled." };
      }
    }

    // 2. Browser OAuth Fallback (Universal - works in Expo Go and web)
    const redirectUrl = Linking.createURL("auth-callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (data?.url) {
      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (authResult.type === "success" && authResult.url) {
        const parsed = Linking.parse(authResult.url);
        // Supabase returns access_token / refresh_token in hash or query
        const fragment = authResult.url.split("#")[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            return { ok: true };
          }
        }
      }
      return { ok: false, message: "Sign in was closed or not completed." };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Google Sign-In failed." };
  }
}

/**
 * Sign in with Apple (Mandatory on iOS under App Store Review Guideline 4.8).
 */
export async function signInWithApple(): Promise<{ ok: boolean; message?: string }> {
  try {
    if (Platform.OS !== "ios") {
      return { ok: false, message: "Apple Sign-In is only available on iOS devices." };
    }

    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { ok: false, message: "Apple Sign-In is not supported on this device." };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("No Apple identity token returned.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    if (err.code === "ERR_REQUEST_CANCELED") {
      return { ok: false, message: "Sign-in cancelled." };
    }
    return { ok: false, message: err?.message || "Apple Sign-In failed." };
  }
}

/** Check if Apple Sign-In button should be displayed (iOS only) */
export async function isAppleSignInSupported(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
