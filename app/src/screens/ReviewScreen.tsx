import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import { explainFor } from "../engine/explanations";
import { useThemeC, type Palette } from "../theme";

export default function ReviewScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { lastReview, closeReview } = useGame();
  const correct = lastReview.filter((r) => r.ok).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Pressable onPress={closeReview} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.tally}>
          {correct}/{lastReview.length} correct
        </Text>
      </View>
      <Text style={styles.title}>Answer Review</Text>

      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {lastReview.length === 0 && <Text style={styles.empty}>No answers to review.</Text>}
        {lastReview.map((r, i) => {
          const skipped = r.chosen === null;
          return (
            <View key={i} style={[styles.card, r.ok ? styles.cardOk : styles.cardBad]}>
              <View style={styles.rowTop}>
                <Text style={styles.tag}>{r.tag}</Text>
                <Text style={[styles.badge, r.ok ? styles.badgeOk : styles.badgeBad]}>
                  {r.ok ? "✓" : skipped ? "—" : "✗"}
                </Text>
              </View>
              <Text style={styles.q}>{r.q}</Text>
              <Text style={styles.line}>
                Your answer:{" "}
                <Text style={[styles.ans, r.ok ? styles.ok : skipped ? styles.muted : styles.bad]}>
                  {skipped ? "Skipped" : `${r.chosen}${r.unit}`}
                </Text>
              </Text>
              {!r.ok && (
                <Text style={styles.line}>
                  Correct answer: <Text style={[styles.ans, styles.ok]}>{`${r.correct}${r.unit}`}</Text>
                </Text>
              )}
              <Text style={styles.why}>💡 {explainFor(r.tag, r.correct, r.unit)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: C.muted, fontWeight: "800", fontSize: 16 },
  tally: { color: C.accent, fontWeight: "800", fontSize: 14 },
  title: { color: C.accent, fontWeight: "900", fontSize: 28, marginTop: 10, marginBottom: 12 },
  empty: { color: C.muted, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, gap: 5 },
  cardOk: { borderColor: "rgba(61,220,151,0.4)" },
  cardBad: { borderColor: "rgba(255,92,92,0.4)" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tag: { color: C.accent2, fontWeight: "800", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  badge: { fontWeight: "900", fontSize: 16 },
  badgeOk: { color: C.correct },
  badgeBad: { color: C.wrong },
  q: { color: C.text, fontWeight: "800", fontSize: 16, marginTop: 2 },
  line: { color: C.muted, fontSize: 14 },
  ans: { fontWeight: "800" },
  ok: { color: C.correct },
  bad: { color: C.wrong },
  muted: { color: C.muted },
  why: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 4, fontStyle: "italic" },
});
