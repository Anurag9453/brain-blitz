import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import { LEGAL_URLS } from "../lib/legal";
import { signInWithGoogle } from "../lib/socialAuth";
import Logo from "../components/Logo";
import { goldGradient, useThemeC, type Palette } from "../theme";

export default function OnboardingScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const setUsername = useGame((s) => s.setUsername);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const canStart = name.trim().length >= 2 && agreed && !busy;

  const go = async () => {
    if (!canStart) return;
    setBusy(true);
    SFX.play("go");
    await setUsername(name);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View style={styles.logoWrap}>
          <Logo size={92} />
        </View>

        <Text style={styles.title}>Welcome to GyanBlitz</Text>
        <Text style={styles.subtitle}>Pick a nickname (no real personal info needed) that other players will see.</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your nickname"
          placeholderTextColor={C.muted}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={16}
          style={styles.input}
          returnKeyType="done"
        />

        <Pressable
          onPress={() => {
            SFX.play("tap");
            setAgreed((a) => !a);
          }}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>
            I am 18+ or have{" "}
            <Text style={styles.consentBold}>parent/guardian permission</Text>, and agree to the{" "}
            <Text
              style={styles.consentLink}
              onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
            >
              Privacy Policy
            </Text>{" "}
            &{" "}
            <Text
              style={styles.consentLink}
              onPress={() => Linking.openURL(LEGAL_URLS.terms)}
            >
              Terms of Service
            </Text>.
          </Text>
        </Pressable>

        <Pressable onPress={go} disabled={!canStart} style={{ width: "100%" }}>
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.btn, !canStart && { opacity: 0.45 }]}
          >
            <Text style={styles.btnText}>Start Playing as Guest</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={async () => {
            SFX.play("tap");
            await signInWithGoogle();
          }}
          style={styles.googleBtn}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </Pressable>

        <Text style={styles.note}>Guest progress can be saved anytime in Account Settings.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  logoWrap: { marginBottom: 10 },
  title: { color: C.text, fontWeight: "900", fontSize: 26, textAlign: "center" },
  subtitle: { color: C.muted, fontSize: 15, textAlign: "center", lineHeight: 21, marginBottom: 6 },
  input: {
    width: "100%", backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5, borderRadius: 16,
    color: C.text, fontSize: 20, fontWeight: "800", textAlign: "center", paddingVertical: 16,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    paddingHorizontal: 4,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: C.accent,
  },
  checkmark: {
    color: C.goldText,
    fontWeight: "900",
    fontSize: 14,
  },
  consentText: {
    flex: 1,
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  consentBold: {
    color: C.text,
    fontWeight: "800",
  },
  consentLink: {
    color: C.accent,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  btn: { borderRadius: 16, paddingVertical: 17, alignItems: "center", marginTop: 4 },
  btnText: { color: C.goldText, fontWeight: "900", fontSize: 18 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 4,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.line,
  },
  dividerText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 15,
    gap: 10,
  },
  googleG: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4285F4",
  },
  googleBtnText: {
    color: "#1f1f1f",
    fontWeight: "800",
    fontSize: 16,
  },
  note: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 6 },
});
