import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import { tierMeta, daysLeft } from "../lib/league";
import { useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function LeagueScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { league, leagueTier, goHome, loadLeague } = useGame();
  const tier = tierMeta(league?.tier ?? leagueTier);
  const promoteCut = league?.promote_cut ?? 7;
  const relegateCut = league?.relegate_cut ?? 7;
  const pod = league?.pod ?? 30;
  const canPromote = (league?.tier ?? leagueTier) < 6;
  const canRelegate = (league?.tier ?? leagueTier) > 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Pressable onPress={goHome} hitSlop={10}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        {!!league && <Text style={styles.days}>⏳ {daysLeft(league.week_ends)} days left</Text>}
      </View>

      <View style={[styles.tierCard, { borderColor: tier.color }]}>
        <Text style={styles.tierEmoji}>{tier.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierLabel}>YOUR LEAGUE</Text>
          <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.lpVal}>{fmt(league?.points ?? 0)}</Text>
          <Text style={styles.lpLabel}>LP this week</Text>
        </View>
      </View>

      <Text style={styles.rules}>
        Play Arena & vs Computer to earn League Points.{" "}
        {canPromote ? `Top ${promoteCut} promote` : "You're in the top league"}
        {canPromote && canRelegate ? " · " : ""}
        {canRelegate ? `bottom ${relegateCut} drop` : ""} when the week ends.
      </Text>

      {!league ? (
        <View style={styles.loading}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {league.board.map((p, i) => {
            const promo = canPromote && p.rank <= promoteCut;
            const releg = canRelegate && p.rank > pod - relegateCut;
            const lastPromo = canPromote && p.rank === promoteCut;
            const firstReleg = canRelegate && p.rank === pod - relegateCut + 1;
            return (
              <React.Fragment key={`${p.rank}-${i}`}>
                {lastPromo && <View style={styles.zoneLine}><Text style={[styles.zoneText, { color: C.correct }]}>⬆ PROMOTION</Text></View>}
                {firstReleg && <View style={styles.zoneLine}><Text style={[styles.zoneText, { color: C.wrong }]}>⬇ RELEGATION</Text></View>}
                <View style={[styles.row, p.you && styles.rowYou]}>
                  <Text style={[styles.rank, promo && { color: C.correct }, releg && { color: C.wrong }]}>{p.rank}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.name}
                    {p.you && <Text style={styles.youTag}>  YOU</Text>}
                  </Text>
                  <Text style={styles.lp}>{fmt(p.lp)}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </ScrollView>
      )}

      <Pressable style={styles.refresh} onPress={() => { SFX.play("tap"); loadLeague(); }}>
        <Text style={styles.refreshText}>↻ Refresh</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { color: C.muted, fontWeight: "800", fontSize: 16 },
    days: { color: C.accent, fontWeight: "800", fontSize: 14 },
    tierCard: {
      flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface,
      borderWidth: 2, borderRadius: 18, padding: 16, marginTop: 12,
    },
    tierEmoji: { fontSize: 40 },
    tierLabel: { color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1.5 },
    tierName: { fontWeight: "900", fontSize: 26, marginTop: 2 },
    lpVal: { color: C.accent, fontWeight: "900", fontSize: 24 },
    lpLabel: { color: C.muted, fontSize: 11, fontWeight: "700" },
    rules: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 12, marginBottom: 6 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    zoneLine: { paddingVertical: 6, alignItems: "center" },
    zoneText: { fontWeight: "900", fontSize: 11, letterSpacing: 1.5 },
    row: {
      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface,
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginVertical: 3,
      borderColor: "transparent", borderWidth: 1,
    },
    rowYou: { borderColor: C.accent, backgroundColor: C.surface2 },
    rank: { width: 30, textAlign: "center", color: C.muted, fontWeight: "900", fontSize: 15 },
    name: { flex: 1, color: C.text, fontWeight: "700", fontSize: 15 },
    youTag: { color: C.accent, fontWeight: "800", fontSize: 11 },
    lp: { color: C.text, fontWeight: "900", fontSize: 16 },
    refresh: { alignItems: "center", paddingVertical: 12 },
    refreshText: { color: C.muted, fontWeight: "800", fontSize: 14 },
  });
