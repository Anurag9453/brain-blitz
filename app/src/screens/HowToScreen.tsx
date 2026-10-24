import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import { useThemeC, type Palette } from "../theme";

export default function HowToScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const Mode = ({ emoji, name, lines }: { emoji: string; name: string; lines: string[] }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {emoji}  {name}
      </Text>
      {lines.map((l, i) => (
        <Text key={i} style={styles.line}>
          • {l}
        </Text>
      ))}
    </View>
  );
  const goHome = useGame((s) => s.goHome);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable onPress={goHome} hitSlop={10}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>How to Play</Text>

      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ The basics</Text>
          <Text style={styles.line}>• Answer as many questions as you can before time runs out.</Text>
          <Text style={styles.line}>• <Text style={styles.good}>+3</Text> for a correct answer, <Text style={styles.bad}>−1</Text> for wrong, 0 for a skip.</Text>
          <Text style={styles.line}>• Pick a subject (Maths / Physics / Chemistry / GK / Mixed) and a level for difficulty.</Text>
          <Text style={styles.line}>• Levels unlock with coins — win in lower levels to afford higher ones.</Text>
          <Text style={styles.line}>• ⭐ Stars show your mastery of a level (earned in Global Arena).</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 XP & win streaks</Text>
          <Text style={styles.line}>• Every match earns XP and raises your account level — it never drops.</Text>
          <Text style={styles.line}>• Finish top-10 in Arena or beat the computer to build a 🔥 win streak.</Text>
          <Text style={styles.line}>• 3 wins → ×1.5 prize, 5 wins → ×2, 7+ wins → ×3. Any loss resets it.</Text>
        </View>

        <Mode
          emoji="🌍"
          name="Global Arena"
          lines={[
            "Compete against ~50 players for the level's prize.",
            "Finish in the top 10 → win double your entry.",
            "Ranks 11–25 → get your entry back (no loss).",
            "Below 25 → you lose your entry.",
          ]}
        />

        <Mode
          emoji="🤖"
          name="vs Computer"
          lines={[
            "A timed duel against a sharp bot (pick 1–5 min on the mode screen).",
            "Score more than the bot → win double your entry.",
            "Tie → entry refunded. Lose → lose your entry.",
          ]}
        />

        <Mode
          emoji="👥"
          name="Play with Friends"
          lines={[
            "Create a room and share the code (up to 4 players).",
            "Everyone answers the exact same questions in the set time.",
            "Highest score wins the whole pot (minus a small house fee).",
            "Quitting early = forfeit (you lose the round).",
          ]}
        />

        <Mode
          emoji="🎯"
          name="Practice & Marathon (free)"
          lines={[
            "Practice: a free 1-minute warm-up at any level — no coins staked.",
            "Marathon: a free 10-minute endurance run with word problems.",
            "Neither costs coins or affects the leaderboard — just play and review.",
          ]}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🪙 Coins</Text>
          <Text style={styles.line}>• Every match costs an entry fee (same for all modes at a level).</Text>
          <Text style={styles.line}>• Top up with your daily reward, and by winning matches.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  back: { color: C.muted, fontWeight: "800", fontSize: 16 },
  title: { color: C.accent, fontWeight: "900", fontSize: 30, marginTop: 12, marginBottom: 14 },
  card: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 16, gap: 7 },
  cardTitle: { color: C.text, fontWeight: "900", fontSize: 17, marginBottom: 4 },
  line: { color: C.muted, fontSize: 14, lineHeight: 20 },
  good: { color: C.correct, fontWeight: "800" },
  bad: { color: C.wrong, fontWeight: "800" },
});
