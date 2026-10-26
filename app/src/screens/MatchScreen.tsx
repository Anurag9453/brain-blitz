import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useGame } from "../state/store";
import type { ReviewItem } from "../state/store";
import { poolFor, poolForAll } from "../engine/generators";
import { nextQuestion } from "../engine";
import type { Question } from "../engine/options";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import { useThemeC, type Palette } from "../theme";

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MatchScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { activeLevel, activeMode, activeDurationMs, opponentTarget, activeQuestions, activeSubjects, endMatch, endDuel, endFriends, endMarathon, endPractice } =
    useGame();
  const level = activeLevel!;
  const isCpu = activeMode === "cpu";
  const isFriends = activeMode === "friends";
  const isMarathon = activeMode === "marathon";
  const isPractice = activeMode === "practice";
  const pool = useMemo(
    () => (isMarathon ? poolForAll(level.cls, activeSubjects) : poolFor(level.cls, activeSubjects)),
    [level, activeSubjects, isMarathon]
  );
  const totalMs = activeDurationMs;

  const [phase, setPhase] = useState<"count" | "play">("count");
  const [count, setCount] = useState(3);
  const [q, setQ] = useState<Question | null>(null);
  // GK text is much longer than maths — shrink to fit; short questions keep full size.
  const qLen = q?.q.length ?? 0;
  const qSize = qLen > 90 ? 22 : qLen > 50 ? 27 : 34;
  const optLen = Math.max(0, ...(q?.options ?? []).map((o) => o.length + (q?.unit.length ?? 0)));
  const optSize = optLen > 18 ? 15 : optLen > 10 ? 18 : 24;
  const [qNo, setQNo] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(level.time);
  const [bar, setBar] = useState(1);
  const [chosen, setChosen] = useState<string | null>(null);
  const [botScore, setBotScore] = useState(0);
  const [showEnd, setShowEnd] = useState(false);

  // Counters read by the (single) finish callback — avoids stale state.
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const attemptedRef = useRef(0);
  const streakRef = useRef(0);
  const lockedRef = useRef(false);
  const finishedRef = useRef(false);
  const endAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickRef = useRef(0);
  const qIdxRef = useRef(0);
  const shownAtRef = useRef(Date.now());
  const reviewRef = useRef<ReviewItem[]>([]);

  // Animated values
  const cdScale = useRef(new Animated.Value(0.4)).current;
  const qAnim = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const streakScale = useRef(new Animated.Value(1)).current;
  const revealPop = useRef(new Animated.Value(0)).current;
  const timerPulse = useRef(new Animated.Value(1)).current;

  // ----- countdown 3..2..1..GO (with tick/go sound + bounce) -----
  useEffect(() => {
    if (phase !== "count") return;
    cdScale.setValue(0.4);
    Animated.spring(cdScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    SFX.play(count > 0 ? "tick" : "go");
    if (count > 0) {
      const t = setTimeout(() => setCount((c) => c - 1), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("play"), 600);
    return () => clearTimeout(t);
  }, [phase, count, cdScale]);

  // ----- play: start timer + first question -----
  useEffect(() => {
    if (phase !== "play") return;
    endAtRef.current = Date.now() + totalMs;
    loadQuestion();
    tickRef.current = setInterval(() => {
      const remain = Math.max(0, endAtRef.current - Date.now());
      setTimeLeft(Math.ceil(remain / 1000));
      setBar(remain / totalMs);
      if (isCpu) setBotScore(Math.round(opponentTarget * (1 - remain / totalMs)));
      if (remain <= 0) finish();
    }, 100);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ----- final-seconds urgency: pulse + tick -----
  const urgent = phase === "play" && timeLeft <= 5 && timeLeft > 0;
  useEffect(() => {
    if (!urgent) {
      timerPulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulse, { toValue: 0.35, duration: 300, useNativeDriver: true }),
        Animated.timing(timerPulse, { toValue: 1, duration: 300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [urgent, timerPulse]);

  useEffect(() => {
    if (phase === "play" && timeLeft <= 3 && timeLeft > 0 && timeLeft !== lastTickRef.current) {
      lastTickRef.current = timeLeft;
      SFX.play("tick");
      Haptics.selectionAsync().catch(() => {});
    }
  }, [timeLeft, phase]);

  function loadQuestion() {
    setChosen(null);
    lockedRef.current = false;
    shownAtRef.current = Date.now();
    // Staked & Friends modes play from a deterministic server-seeded set.
    const next = activeQuestions.length > 0 ? activeQuestions[qIdxRef.current] ?? nextQuestion(pool) : nextQuestion(pool);
    qIdxRef.current += 1;
    setQ(next);
    setQNo((n) => n + 1);
    revealPop.setValue(0);
    qAnim.setValue(0);
    Animated.timing(qAnim, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }

  function answer(val: string) {
    if (lockedRef.current || finishedRef.current || !q) return;
    lockedRef.current = true;
    const ms = Math.max(1, Date.now() - shownAtRef.current);
    const right = val === q.a;
    attemptedRef.current += 1;
    reviewRef.current.push({ q: q.q, tag: q.tag, unit: q.unit, chosen: val, correct: q.a, ok: right, ms });
    if (right) {
      scoreRef.current += 3;
      correctRef.current += 1;
      streakRef.current += 1;
      setStreak(streakRef.current);
      streakScale.setValue(0.6);
      Animated.spring(streakScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      SFX.play("correct");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (streakRef.current > 0 && streakRef.current % 5 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    } else {
      scoreRef.current -= 1;
      wrongRef.current += 1;
      streakRef.current = 0;
      setStreak(0);
      SFX.play("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    setScore(scoreRef.current);
    scoreScale.setValue(1);
    Animated.sequence([
      Animated.spring(scoreScale, { toValue: 1.35, friction: 4, useNativeDriver: true }),
      Animated.spring(scoreScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    Animated.spring(revealPop, { toValue: 1, friction: 4, useNativeDriver: true }).start();

    setChosen(val);
    advanceRef.current = setTimeout(() => {
      if (!finishedRef.current) loadQuestion();
    }, right ? 300 : 520);
  }

  function skip() {
    if (lockedRef.current || finishedRef.current) return;
    if (q) reviewRef.current.push({ q: q.q, tag: q.tag, unit: q.unit, chosen: null, correct: q.a, ok: false });
    streakRef.current = 0;
    setStreak(0);
    SFX.play("tap");
    Haptics.selectionAsync().catch(() => {});
    loadQuestion();
  }

  function confirmEnd() {
    if (finishedRef.current) return;
    setShowEnd(true);
  }
  const endMsg = isFriends
    ? "If you quit now you forfeit this round and lose. Quit anyway?"
    : isMarathon || isPractice
    ? "End this practice run now? Your score so far will be shown."
    : "Your score so far will be tallied now. The entry fee isn't refunded.";

  function finish(forfeit = false) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
    const rv = reviewRef.current;
    if (isCpu) endDuel(correctRef.current, wrongRef.current, attemptedRef.current, rv);
    else if (isFriends) endFriends(correctRef.current, wrongRef.current, attemptedRef.current, rv, forfeit);
    else if (isMarathon) endMarathon(correctRef.current, wrongRef.current, attemptedRef.current, rv);
    else if (isPractice) endPractice(correctRef.current, wrongRef.current, attemptedRef.current, rv);
    else endMatch(correctRef.current, wrongRef.current, attemptedRef.current, rv);
  }

  if (phase === "count") {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Animated.Text style={[styles.countNum, { opacity: cdScale, transform: [{ scale: cdScale }] }]}>
          {count > 0 ? count : "GO"}
        </Animated.Text>
      </SafeAreaView>
    );
  }

  const warn = timeLeft <= 10;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.matchtop}>
        <Animated.View style={{ opacity: timerPulse }}>
          <Text style={[styles.timer, warn && { color: C.wrong }]}>
            {mmss(timeLeft)} <Text style={styles.timerSmall}>left</Text>
          </Text>
        </Animated.View>
        <View style={{ alignItems: "flex-end" }}>
          <Animated.Text style={[styles.scoreVal, { transform: [{ scale: scoreScale }] }]}>{score}</Animated.Text>
          <Text style={styles.scoreLabel}>{isCpu ? "YOU" : "SCORE"}</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(0, bar) * 100}%` }]} />
      </View>
      {isCpu && (
        <View style={styles.duelStrip}>
          <Text style={[styles.duelSide, score >= botScore && styles.duelLead]}>YOU {score}</Text>
          <Text style={styles.duelVs}>vs</Text>
          <Text style={[styles.duelSide, botScore > score && styles.duelLead]}>🤖 {botScore}</Text>
        </View>
      )}

      <View style={styles.qwrap}>
        {streak >= 2 && (
          <Animated.Text style={[styles.streak, { transform: [{ scale: streakScale }] }]}>
            🔥 {streak} in a row!
          </Animated.Text>
        )}
        <Text style={styles.qcount}>QUESTION {qNo}</Text>
        <Animated.View
          style={{
            opacity: qAnim,
            transform: [{ translateY: qAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <Text style={styles.qtag}>{q?.tag}</Text>
          <Text style={[styles.question, { fontSize: qSize }]}>{q?.q}</Text>
        </Animated.View>
      </View>

      <View style={styles.options}>
        {q?.options.map((opt) => {
          const reveal = chosen !== null;
          const isCorrect = reveal && opt === q.a;
          const isWrong = reveal && opt === chosen && opt !== q.a;
          const dim = reveal && !isCorrect && !isWrong;
          return (
            <AnimatedPressable
              key={opt}
              onPress={() => answer(opt)}
              style={[
                styles.opt,
                isCorrect && styles.optCorrect,
                isWrong && styles.optWrong,
                dim && { opacity: 0.4 },
                isCorrect && {
                  transform: [{ scale: revealPop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
                },
              ]}
            >
              <Text style={[styles.optText, { fontSize: optSize }, isCorrect && { color: C.correct }, isWrong && { color: C.wrong }]}>
                {opt}
                {q.unit}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={skip} style={styles.skip}>
          <Text style={styles.skipText}>Skip →</Text>
        </Pressable>
        <Pressable onPress={confirmEnd} style={styles.end}>
          <Text style={styles.endText}>End test</Text>
        </Pressable>
      </View>

      <AppDialog
        visible={showEnd}
        emoji="⏹"
        title={isFriends ? "Forfeit round?" : "End test?"}
        message={endMsg}
        confirmText={isFriends ? "Forfeit" : "End test"}
        cancelText="Keep going"
        destructive
        onConfirm={() => { setShowEnd(false); finish(isFriends); }}
        onCancel={() => setShowEnd(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  center: { alignItems: "center", justifyContent: "center" },
  countNum: { color: C.accent, fontSize: 130, fontWeight: "900" },
  matchtop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  timer: { color: C.text, fontWeight: "900", fontSize: 34 },
  timerSmall: { color: C.muted, fontSize: 13, fontWeight: "700" },
  scoreVal: { color: C.text, fontWeight: "900", fontSize: 28 },
  scoreLabel: { color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  barTrack: { height: 6, borderRadius: 6, backgroundColor: C.surface, overflow: "hidden", marginTop: 12 },
  barFill: { height: "100%", backgroundColor: C.accent2 },
  duelStrip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 },
  duelSide: { color: C.muted, fontWeight: "800", fontSize: 16 },
  duelLead: { color: C.accent },
  duelVs: { color: C.muted, fontWeight: "700", fontSize: 12 },
  qwrap: { flex: 1, justifyContent: "center" },
  streak: { color: C.accent, fontWeight: "900", fontSize: 18, textAlign: "center", marginBottom: 10 },
  qcount: { color: C.muted, fontWeight: "800", fontSize: 13, letterSpacing: 1, textAlign: "center", marginBottom: 6 },
  qtag: { color: C.accent2, fontWeight: "800", fontSize: 12, letterSpacing: 1, textAlign: "center", marginBottom: 14 },
  question: { color: C.text, fontWeight: "900", fontSize: 34, textAlign: "center", paddingHorizontal: 4 },
  options: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  opt: {
    width: "48%", backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5,
    borderRadius: 16, paddingVertical: 22, paddingHorizontal: 8, alignItems: "center", justifyContent: "center",
  },
  optCorrect: { backgroundColor: "rgba(61,220,151,0.18)", borderColor: C.correct },
  optWrong: { backgroundColor: "rgba(255,92,92,0.16)", borderColor: C.wrong },
  optText: { color: C.text, fontWeight: "800", fontSize: 24, textAlign: "center" },
  footer: { flexDirection: "row", gap: 10, marginTop: 12 },
  skip: { flex: 1, borderColor: C.line, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  skipText: { color: C.muted, fontWeight: "800", fontSize: 15 },
  end: { borderColor: "rgba(255,92,92,0.5)", borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22, alignItems: "center" },
  endText: { color: C.wrong, fontWeight: "800", fontSize: 15 },
});
