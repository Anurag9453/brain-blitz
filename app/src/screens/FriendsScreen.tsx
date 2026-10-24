import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import { goldGradient, useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function FriendsScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { levels, selLevel, hostRoom, joinRoomByCode, goModes, error } = useGame();
  const [code, setCode] = useState("");
  const level = levels[selLevel - 1];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable onPress={goModes} hitSlop={10}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Play with Friends</Text>
      <Text style={styles.subtitle}>
        Up to 4 players, same questions, 2 minutes. Winner takes the pot (minus a small fee). {fmt(level?.fee ?? 0)} ₵ each.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.section}>
        <Text style={styles.label}>HOST A NEW ROOM</Text>
        <Text style={styles.hint}>Difficulty: {level?.name}. You'll get a code to share.</Text>
        <Pressable
          onPress={() => {
            SFX.play("tap");
            hostRoom();
          }}
        >
          <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.primary}>
            <Text style={styles.primaryText}>Create Room</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>OR</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>JOIN WITH A CODE</Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="ENTER CODE"
          placeholderTextColor={C.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          style={styles.input}
        />
        <Pressable
          disabled={code.trim().length < 4}
          onPress={() => {
            SFX.play("tap");
            joinRoomByCode(code);
          }}
          style={[styles.joinBtn, code.trim().length < 4 && { opacity: 0.5 }]}
        >
          <Text style={styles.joinText}>Join Room</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  back: { color: C.muted, fontWeight: "800", fontSize: 16 },
  title: { color: C.accent, fontWeight: "900", fontSize: 30, marginTop: 16 },
  subtitle: { color: C.muted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  error: { color: C.wrong, fontSize: 13, fontWeight: "700", marginTop: 12 },
  section: { marginTop: 26 },
  label: { color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1.5 },
  hint: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 12 },
  primary: { borderRadius: 16, paddingVertical: 17, alignItems: "center", marginTop: 6 },
  primaryText: { color: C.goldText, fontWeight: "900", fontSize: 18 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 26 },
  line: { flex: 1, height: 1, backgroundColor: C.line },
  or: { color: C.muted, fontWeight: "800", fontSize: 12 },
  input: {
    backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5, borderRadius: 14,
    color: C.text, fontSize: 24, fontWeight: "900", letterSpacing: 6, textAlign: "center",
    paddingVertical: 16, marginTop: 12, marginBottom: 12,
  },
  joinBtn: { backgroundColor: C.surface, borderColor: C.accent, borderWidth: 1.5, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  joinText: { color: C.accent, fontWeight: "900", fontSize: 16 },
});
