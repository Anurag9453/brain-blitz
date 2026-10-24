import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import Logo from "../components/Logo";
import { goldGradient, useThemeC, type Palette } from "../theme";

export default function OnboardingScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const setUsername = useGame((s) => s.setUsername);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
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

        <Text style={styles.title}>Welcome to Brain Blitz</Text>
        <Text style={styles.subtitle}>What should we call you? This is the name other players will see.</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={C.muted}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={16}
          style={styles.input}
          returnKeyType="go"
          onSubmitEditing={go}
        />

        <Pressable onPress={go} disabled={name.trim().length < 2 || busy} style={{ width: "100%" }}>
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.btn, (name.trim().length < 2 || busy) && { opacity: 0.5 }]}
          >
            <Text style={styles.btnText}>Start Playing</Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.note}>You're signed in on this device — no password needed.</Text>
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
  btn: { borderRadius: 16, paddingVertical: 17, alignItems: "center", marginTop: 4 },
  btnText: { color: C.goldText, fontWeight: "900", fontSize: 18 },
  note: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 6 },
});
