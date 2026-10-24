import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import Confetti from "../components/Confetti";
import { goldGradient, useThemeC, type Palette } from "../theme";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ResultScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const Stat = ({ v, k, color }: { v: number; k: string; color?: string }) => (
    <View style={styles.stat}>
      <Text style={[styles.statV, color && { color }]}>{v}</Text>
      <Text style={styles.statK}>{k}</Text>
    </View>
  );
  const XpStrip = ({ xpGain, streak, bonus, mult }: { xpGain: number; streak: number; bonus: number; mult: number }) => (
    <View style={styles.xpStrip}>
      <Text style={styles.xpStripText}>＋{xpGain} XP</Text>
      {streak >= 2 && (
        <Text style={styles.streakStripText}>
          🔥 {streak} win streak{bonus > 0 ? `  ·  ×${mult} +${bonus} ₵` : ""}
        </Text>
      )}
    </View>
  );
  const { result, levels, goHome, playLevel, selectLevel, beginDuel, beginMarathon, beginPractice, openReview } = useGame();
  const score = !result ? 0 : result.kind === "duel" ? result.player_score : result.score;
  const stars = result && result.kind === "arena" ? result.stars : 0;
  const prize = result && (result.kind === "arena" || result.kind === "duel") ? result.prize : 0;

  // score count-up
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [shownScore, setShownScore] = useState(0);
  // star pops
  const s0 = useRef(new Animated.Value(0)).current;
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const starVals = [s0, s1, s2];

  useEffect(() => {
    const id = scoreAnim.addListener(({ value }) => setShownScore(Math.round(value)));
    Animated.timing(scoreAnim, { toValue: score, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    Animated.stagger(150, starVals.map((v) => Animated.spring(v, { toValue: 1, friction: 4, useNativeDriver: true }))).start();

    for (let i = 0; i < stars; i++) {
      setTimeout(() => {
        SFX.play("coin");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }, 150 * i + 250);
    }
    const winDelay = 150 * Math.max(stars, 1) + 350;
    const t = setTimeout(() => {
      if (prize > 0 || stars === 3) SFX.play("win");
    }, winDelay);

    return () => {
      scoreAnim.removeListener(id);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  // ---------- Free practice result (Marathon & Practice) ----------
  if (result.kind === "marathon" || result.kind === "practice") {
    const { level, correct, wrong, attempted } = result;
    const isMarathon = result.kind === "marathon";
    const playAgain = isMarathon ? beginMarathon : beginPractice;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.place}>{level.name.toUpperCase()} · {isMarathon ? "MARATHON" : "PRACTICE"}</Text>
          <Text style={styles.score}>{shownScore}</Text>
          <Text style={styles.scoreLabel}>final score</Text>
          <View style={styles.statGrid}>
            <Stat v={attempted} k="ATTEMPTED" />
            <Stat v={correct} k="CORRECT" color={C.correct} />
            <Stat v={wrong} k="WRONG" color={C.wrong} />
          </View>
          <View style={[styles.coinAward, styles.coinAwardLoss]}>
            <Text style={[styles.coinAwardText, { color: C.muted }]}>Practice run — no coins staked. Great for learning! 🎯</Text>
          </View>
          <Pressable style={styles.reviewBtn} onPress={() => { SFX.play("tap"); openReview(); }}>
            <Text style={styles.reviewText}>📋 Review answers</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.secondary} onPress={() => { SFX.play("tap"); goHome(); }}>
            <Text style={styles.secondaryText}>Levels</Text>
          </Pressable>
          <Pressable style={{ flex: 1.4 }} onPress={() => { SFX.play("tap"); playAgain(); }}>
            <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.primary}>
              <Text style={styles.primaryText}>Play Again</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Duel result ----------
  if (result.kind === "duel") {
    const { level, correct, wrong, attempted, opponent_score, outcome } = result;
    const won = outcome === "win";
    const draw = outcome === "draw";
    const headline = won ? "YOU WIN! 🏆" : draw ? "DRAW" : "BOT WINS";
    const msg = won
      ? `🏆 You beat the bot! +${prize} ₵`
      : draw
      ? `Draw — your ${level.fee} ₵ entry was refunded.`
      : `The bot edged you out — −${level.fee} ₵.`;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.place}>{level.name.toUpperCase()} · VS COMPUTER</Text>
          <Text style={[styles.duelHeadline, won && { color: C.correct }, !won && !draw && { color: C.wrong }]}>
            {headline}
          </Text>
          <View style={styles.versus}>
            <View style={styles.vBlock}>
              <Text style={styles.vScore}>{shownScore}</Text>
              <Text style={styles.vLabel}>YOU</Text>
            </View>
            <Text style={styles.vDash}>—</Text>
            <View style={styles.vBlock}>
              <Text style={[styles.vScore, { color: C.muted }]}>{opponent_score}</Text>
              <Text style={styles.vLabel}>🤖 CPU</Text>
            </View>
          </View>
          <View style={[styles.coinAward, !won && styles.coinAwardLoss]}>
            <Text style={[styles.coinAwardText, !won && { color: draw ? C.muted : C.wrong }]}>{msg}</Text>
          </View>
          <XpStrip xpGain={result.xp_gain} streak={result.win_streak} bonus={result.streak_bonus} mult={result.multiplier} />
          <View style={styles.statGrid}>
            <Stat v={attempted} k="ATTEMPTED" />
            <Stat v={correct} k="CORRECT" color={C.correct} />
            <Stat v={wrong} k="WRONG" color={C.wrong} />
          </View>
          <Pressable style={styles.reviewBtn} onPress={() => { SFX.play("tap"); openReview(); }}>
            <Text style={styles.reviewText}>📋 Review answers</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.secondary} onPress={() => { SFX.play("tap"); goHome(); }}>
            <Text style={styles.secondaryText}>Levels</Text>
          </Pressable>
          <Pressable style={{ flex: 1.4 }} onPress={() => { SFX.play("tap"); selectLevel(level.n); beginDuel("cpu"); }}>
            <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.primary}>
              <Text style={styles.primaryText}>Play Again</Text>
            </LinearGradient>
          </Pressable>
        </View>
        <Confetti run={won} />
      </SafeAreaView>
    );
  }

  // ---------- Arena result ----------
  const { level, rank, total, correct, wrong, attempted, board, unlocked_next } = result;

  const nextLevel = levels[level.n];
  const showNext = unlocked_next && !!nextLevel;
  const won = rank <= 10;
  const safe = rank > 10 && rank <= 25;
  const celebrate = won || stars === 3;

  const prizeMsg = won
    ? `🏆 Top 10! +${prize} ₵ — double your entry`
    : safe
    ? `Ranks 11–25 — entry refunded (${level.fee} ₵). No loss.`
    : `Outside top 25 — entry fee lost (−${level.fee} ₵).`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.place}>
          {level.name.toUpperCase()} · RANK {rank} OF {total}
        </Text>
        <Text style={styles.score}>{shownScore}</Text>
        <Text style={styles.scoreLabel}>final score</Text>

        <View style={styles.starsRow}>
          {starVals.map((v, i) => (
            <Animated.Text
              key={i}
              style={[styles.starBig, { color: i < stars ? C.accent : C.line, transform: [{ scale: v }] }]}
            >
              ★
            </Animated.Text>
          ))}
        </View>

        {showNext ? (
          <View style={[styles.banner, styles.bannerGood]}>
            <Text style={styles.bannerGoodText}>🔓 Level {nextLevel.n} unlocked — {nextLevel.name}!</Text>
          </View>
        ) : stars === 0 ? (
          <View style={[styles.banner, styles.bannerBad]}>
            <Text style={styles.bannerBadText}>Score {level.stars[0]}+ to earn a ⭐ and unlock the next level.</Text>
          </View>
        ) : null}

        <View style={styles.statGrid}>
          <Stat v={attempted} k="ATTEMPTED" />
          <Stat v={correct} k="CORRECT" color={C.correct} />
          <Stat v={wrong} k="WRONG" color={C.wrong} />
        </View>

        <View style={[styles.coinAward, !won && (safe ? styles.coinAwardLoss : styles.coinAwardLoss)]}>
          <Text style={[styles.coinAwardText, !won && { color: safe ? C.muted : C.wrong }]}>{prizeMsg}</Text>
        </View>
        <XpStrip xpGain={result.xp_gain} streak={result.win_streak} bonus={result.streak_bonus} mult={result.multiplier} />

        <Text style={styles.lbLabel}>MATCH LEADERBOARD · {total} PLAYERS</Text>
        {board.map((p, i) => {
          const gap = i > 0 && p.rank - board[i - 1].rank > 1;
          return (
            <React.Fragment key={`${p.rank}-${i}`}>
              {gap && <Text style={styles.gap}>· · ·</Text>}
              <View style={[styles.row, p.you && styles.rowYou]}>
                <Text style={[styles.rank, p.rank <= 10 && { color: C.accent }]}>
                  {p.rank <= 3 ? MEDALS[p.rank - 1] : p.rank}
                </Text>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                  {p.you && <Text style={styles.youTag}>  YOU</Text>}
                </Text>
                <Text style={styles.zone}>{p.rank <= 10 ? "10×" : p.rank <= 25 ? "safe" : ""}</Text>
                <Text style={styles.rowScore}>{p.score}</Text>
              </View>
            </React.Fragment>
          );
        })}
        <Pressable style={styles.reviewBtn} onPress={() => { SFX.play("tap"); openReview(); }}>
          <Text style={styles.reviewText}>📋 Review answers</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={styles.secondary}
          onPress={() => {
            SFX.play("tap");
            goHome();
          }}
        >
          <Text style={styles.secondaryText}>Levels</Text>
        </Pressable>
        <Pressable
          style={{ flex: 1.4 }}
          onPress={() => {
            SFX.play("tap");
            showNext ? playLevel(nextLevel.n) : playLevel(level.n);
          }}
        >
          <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.primary}>
            <Text style={styles.primaryText}>{showNext ? `Next: ${nextLevel.name} →` : "Play Again"}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Confetti run={celebrate} />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  place: { color: C.accent2, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, textAlign: "center", marginTop: 8 },
  score: { color: C.accent, fontWeight: "900", fontSize: 60, textAlign: "center" },
  scoreLabel: { color: C.muted, fontSize: 14, textAlign: "center" },
  duelHeadline: { color: C.accent, fontWeight: "900", fontSize: 34, textAlign: "center", marginTop: 12 },
  versus: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginVertical: 18 },
  vBlock: { alignItems: "center" },
  vScore: { color: C.accent, fontWeight: "900", fontSize: 52 },
  vLabel: { color: C.muted, fontWeight: "800", fontSize: 13, marginTop: 2 },
  vDash: { color: C.muted, fontSize: 28, fontWeight: "700" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 10 },
  starBig: { fontSize: 40 },
  banner: { borderRadius: 12, padding: 10, marginVertical: 4 },
  bannerGood: { backgroundColor: "rgba(61,220,151,0.12)", borderColor: C.correct, borderWidth: 1 },
  bannerGoodText: { color: C.correct, fontWeight: "800", fontSize: 14, textAlign: "center" },
  bannerBad: { backgroundColor: "rgba(255,92,92,0.1)", borderColor: C.wrong, borderWidth: 1 },
  bannerBadText: { color: C.wrong, fontWeight: "800", fontSize: 13, textAlign: "center" },
  statGrid: { flexDirection: "row", gap: 10, marginVertical: 16 },
  stat: { flex: 1, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  statV: { color: C.text, fontWeight: "900", fontSize: 26 },
  statK: { color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 0.6, marginTop: 3 },
  reviewBtn: { borderColor: C.line, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 14 },
  reviewText: { color: C.text, fontWeight: "800", fontSize: 15 },
  xpStrip: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 },
  xpStripText: { color: C.accent2, fontWeight: "900", fontSize: 14 },
  streakStripText: { color: C.accent, fontWeight: "800", fontSize: 14 },
  coinAward: { backgroundColor: C.coinPill, borderColor: C.coinBorder, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: "center", marginBottom: 18 },
  coinAwardLoss: { backgroundColor: C.surface, borderColor: C.line },
  coinAwardText: { color: C.accent, fontWeight: "800", fontSize: 16, textAlign: "center" },
  lbLabel: { color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 6, borderColor: "transparent", borderWidth: 1 },
  rowYou: { borderColor: C.accent, backgroundColor: C.surface2 },
  rank: { width: 26, textAlign: "center", color: C.muted, fontWeight: "900", fontSize: 15 },
  name: { flex: 1, color: C.text, fontWeight: "700", fontSize: 15 },
  youTag: { color: C.accent, fontWeight: "800", fontSize: 11 },
  zone: { color: C.accent, fontWeight: "800", fontSize: 11, minWidth: 36, textAlign: "right" },
  gap: { color: C.muted, textAlign: "center", fontSize: 16, marginVertical: 2 },
  rowScore: { color: C.text, fontWeight: "900", fontSize: 16, minWidth: 40, textAlign: "right" },
  actions: { flexDirection: "row", gap: 10, paddingTop: 12 },
  secondary: { flex: 1, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  secondaryText: { color: C.text, fontWeight: "800", fontSize: 16 },
  primary: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryText: { color: C.goldText, fontWeight: "900", fontSize: 16 },
});
