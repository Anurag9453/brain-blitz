import React, { useState, useEffect } from "react";
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { goldGradient, useThemeC, type Palette } from "../theme";
import * as SFX from "../lib/sfx";
import type { Question } from "../engine/options";
import type { DailyResult } from "../lib/api";

interface Props {
  visible: boolean;
  question: Question | null;
  onSubmit: (correct: boolean) => Promise<DailyResult>;
  onClose: () => void;
}

// Daily reward as a one-question challenge: answer correctly to claim a
// streak-scaled coin reward; a wrong answer earns nothing.
export default function DailyDialog({ visible, question, onSubmit, onClose }: Props) {
  const C = useThemeC();
  const styles = makeStyles(C);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DailyResult | null>(null);

  useEffect(() => {
    if (visible) { setChosen(null); setBusy(false); setResult(null); }
  }, [visible]);

  if (!question) return null;
  const answered = result !== null;

  const pick = async (val: string) => {
    if (busy || chosen !== null) return;
    setChosen(val);
    const correct = val === question.a;
    SFX.play(correct ? "correct" : "wrong");
    Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
    setBusy(true);
    try {
      const res = await onSubmit(correct);
      setResult(res);
      if (res.claimed) SFX.play("coin");
    } catch {
      setResult({ claimed: false, reason: "ERROR" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {!answered ? (
            <>
              <Text style={styles.kicker}>🎁  DAILY CHALLENGE</Text>
              <Text style={styles.sub}>Answer correctly to claim today's reward</Text>
              <Text style={styles.q}>{question.q}</Text>
              <View style={styles.opts}>
                {question.options.map((o) => {
                  const showState = chosen !== null;
                  const isAnswer = o === question.a;
                  const isChosen = chosen === o;
                  return (
                    <Pressable
                      key={o}
                      disabled={showState}
                      onPress={() => pick(o)}
                      style={[
                        styles.opt,
                        showState && isAnswer && styles.optCorrect,
                        showState && isChosen && !isAnswer && styles.optWrong,
                      ]}
                    >
                      <Text style={[styles.optText, showState && (isAnswer || isChosen) && styles.optTextOn]}>
                        {o}{question.unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {busy && <ActivityIndicator color={C.accent} style={{ marginTop: 8 }} />}
            </>
          ) : result.claimed ? (
            <>
              <Text style={styles.bigEmoji}>🎉</Text>
              <Text style={styles.title}>+{result.amount} ₵</Text>
              <Text style={styles.sub}>Day {result.streak} streak 🔥 — see you tomorrow!</Text>
              <Pressable style={{ width: "100%", marginTop: 8 }} onPress={() => { SFX.play("tap"); onClose(); }}>
                <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.collect}>
                  <Text style={styles.collectText}>Collect</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.bigEmoji}>😅</Text>
              <Text style={styles.title}>Better luck next time!</Text>
              <Text style={styles.sub}>
                {result.reason === "ERROR"
                  ? "Something went wrong — please try again later."
                  : `The answer was ${question.a}${question.unit}. No points today — come back tomorrow!`}
              </Text>
              <Pressable style={[styles.collect, styles.okBtn]} onPress={() => { SFX.play("tap"); onClose(); }}>
                <Text style={styles.okText}>OK</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
    card: {
      width: "100%", maxWidth: 380, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1,
      borderRadius: 22, padding: 22, alignItems: "center", gap: 8,
    },
    kicker: { color: C.accent2, fontWeight: "900", fontSize: 13, letterSpacing: 1.5 },
    sub: { color: C.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
    q: { color: C.text, fontWeight: "800", fontSize: 19, textAlign: "center", marginTop: 8, marginBottom: 6, lineHeight: 26 },
    opts: { width: "100%", gap: 10, marginTop: 4 },
    opt: { backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1.5, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
    optCorrect: { backgroundColor: C.correct, borderColor: C.correct },
    optWrong: { backgroundColor: C.wrong, borderColor: C.wrong },
    optText: { color: C.text, fontWeight: "800", fontSize: 18 },
    optTextOn: { color: "#fff" },
    bigEmoji: { fontSize: 52 },
    title: { color: C.accent, fontWeight: "900", fontSize: 30, textAlign: "center" },
    collect: { borderRadius: 16, paddingVertical: 16, alignItems: "center", width: "100%" },
    collectText: { color: C.goldText, fontWeight: "900", fontSize: 17 },
    okBtn: { backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1 },
    okText: { color: C.text, fontWeight: "800", fontSize: 16 },
  });
