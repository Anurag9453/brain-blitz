import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import { useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const DURATIONS = [
  { s: 60, label: "1 min" },
  { s: 120, label: "2 min" },
  { s: 180, label: "3 min" },
  { s: 300, label: "5 min" },
];

export default function ModeScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { levels, selLevel, coins, beginMatch, beginDuel, beginMarathon, beginPractice, openFriends, openStore, goHome, error, duelSeconds, setDuelSeconds, friendsSeconds, setFriendsSeconds } = useGame();
  const [lockMode, setLockMode] = useState<string | null>(null);
  const level = levels[selLevel - 1];
  if (!level) return null;

  const modes = [
    {
      key: "arena",
      emoji: "🌍",
      name: "Global Arena",
      desc: "Climb the world ranking. Top 10 win double your entry.",
      stake: `entry ${fmt(level.fee)} ₵`,
      ready: true,
      afford: coins >= level.fee,
      onPlay: () => {
        SFX.play("go");
        beginMatch();
      },
    },
    {
      key: "cpu",
      emoji: "🤖",
      name: "vs Computer",
      desc: "Timed duel vs a sharp bot. Beat it → double your entry · lose → −entry.",
      stake: `entry ${fmt(level.fee)} ₵`,
      ready: true,
      afford: coins >= level.fee,
      len: true,
      onPlay: () => {
        SFX.play("go");
        beginDuel("cpu");
      },
    },
    {
      key: "pvp",
      emoji: "⚔️",
      name: "1v1 Duel",
      desc: "Face a live player anywhere in the world, same questions.",
      stake: "Coming soon",
      ready: false,
    },
    {
      key: "friends",
      emoji: "👥",
      name: "Play with Friends",
      desc: "Private room, up to 4 players. Winner takes the pot.",
      stake: `${fmt(level.fee)} ₵ each`,
      ready: true,
      afford: coins >= level.fee,
      len: true,
      onPlay: () => {
        SFX.play("tap");
        openFriends();
      },
    },
    {
      key: "practice",
      emoji: "🎯",
      name: "Practice",
      desc: "Free 1-minute warm-up at this level. No coins, no pressure — just play.",
      stake: "Free",
      ready: true,
      afford: true,
      onPlay: () => {
        SFX.play("go");
        beginPractice();
      },
    },
    {
      key: "marathon",
      emoji: "🏃",
      name: "Marathon",
      desc: "10-minute endurance run with word problems. Practice & review — free.",
      stake: "Free",
      ready: true,
      afford: true,
      onPlay: () => {
        SFX.play("go");
        beginMarathon();
      },
    },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topbar}>
        <Pressable onPress={goHome} hitSlop={10}>
          <Text style={styles.back}>‹ Levels</Text>
        </Pressable>
        <View style={styles.coins}>
          <View style={styles.coinDot}>
            <Text style={styles.coinDotText}>₵</Text>
          </View>
          <Text style={styles.coinVal}>{fmt(coins)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{level.name}</Text>
      <Text style={styles.subtitle}>Choose how you want to play</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <ScrollView style={{ flex: 1, marginTop: 14 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
        {modes.map((m) => {
          const comingSoon = !m.ready;
          const broke = m.ready && "afford" in m && !m.afford;
          const showLen = m.ready && "len" in m && m.len;
          const lenSecs = m.key === "friends" ? friendsSeconds : duelSeconds;
          const setLenSecs = m.key === "friends" ? setFriendsSeconds : setDuelSeconds;
          return (
            <Pressable
              key={m.key}
              disabled={comingSoon}
              onPress={() => {
                if (broke) {
                  SFX.play("tap");
                  setLockMode(m.name);
                  return;
                }
                if ("onPlay" in m) m.onPlay();
              }}
              style={[styles.card, comingSoon && styles.cardSoon, broke && styles.cardBroke]}
            >
              <View style={styles.cardRow}>
                <Text style={styles.emoji}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Text style={styles.desc}>{m.desc}</Text>
                </View>
                <View style={styles.right}>
                  {m.ready ? (
                    <Text style={[styles.stake, "afford" in m && !m.afford && { color: C.wrong }]}>{m.stake}</Text>
                  ) : (
                    <Text style={styles.soon}>SOON</Text>
                  )}
                </View>
              </View>
              {showLen && (
                <View style={styles.lenWrap}>
                  <Text style={styles.lenLabel}>Match length</Text>
                  <View style={styles.lenRow}>
                    {DURATIONS.map((d) => (
                      <Pressable
                        key={d.s}
                        onPress={() => {
                          SFX.play("tap");
                          setLenSecs(d.s);
                        }}
                        style={[styles.lenPill, lenSecs === d.s && styles.lenPillOn]}
                      >
                        <Text style={[styles.lenText, lenSecs === d.s && styles.lenTextOn]}>{d.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <AppDialog
        visible={!!lockMode}
        emoji="🔒"
        title="Not enough coins"
        message={lockMode ? `${lockMode} at ${level.name} costs ${fmt(level.fee)} ₵. Get more coins to unlock it.` : ""}
        confirmText="Get coins"
        onConfirm={() => { setLockMode(null); openStore(); }}
        onCancel={() => setLockMode(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: C.muted, fontWeight: "800", fontSize: 16 },
  coins: {
    flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.coinPill,
    borderColor: C.coinBorder, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  coinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  coinDotText: { color: "#7a5410", fontWeight: "900", fontSize: 11 },
  coinVal: { color: C.accent, fontWeight: "800", fontSize: 16 },
  title: { color: C.accent, fontWeight: "900", fontSize: 32, marginTop: 18 },
  subtitle: { color: C.muted, fontSize: 15, marginTop: 2 },
  lenWrap: { borderTopColor: C.line, borderTopWidth: 1, paddingTop: 12, gap: 8 },
  lenLabel: { color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  lenRow: { flexDirection: "row", gap: 8 },
  lenPill: { flex: 1, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: "center" },
  lenPillOn: { backgroundColor: C.accent2, borderColor: C.accent2 },
  lenText: { color: C.muted, fontWeight: "800", fontSize: 13 },
  lenTextOn: { color: "#fff" },
  error: { color: C.wrong, fontSize: 13, fontWeight: "700", marginTop: 10 },
  card: {
    backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5,
    borderRadius: 18, padding: 16, gap: 12,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardSoon: { opacity: 0.55 },
  cardBroke: { opacity: 0.6 },
  emoji: { fontSize: 32 },
  name: { color: C.text, fontWeight: "800", fontSize: 18 },
  desc: { color: C.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  right: { alignItems: "flex-end" },
  stake: { color: C.accent, fontWeight: "800", fontSize: 13 },
  soon: { color: C.muted, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
});
