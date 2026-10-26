import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame, ReviewItem } from "../state/store";
import { explainFor } from "../engine/explanations";
import { useThemeC, type Palette } from "../theme";
import * as api from "../lib/api";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";

const REPORT_REASONS = [
  "Wrong Answer",
  "Typo or Grammar Error",
  "Question is Confusing",
  "Incorrect Chapter or Topic",
  "Other",
];

export default function ReviewScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { lastReview, closeReview } = useGame();
  const correct = lastReview.filter((r) => r.ok).length;

  const [reportItem, setReportItem] = useState<ReviewItem | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [reportedKeys, setReportedKeys] = useState<Set<string>>(new Set());
  const [dlg, setDlg] = useState<{ title: string; message: string; emoji?: string } | null>(null);

  const onOpenReport = (item: ReviewItem) => {
    SFX.play("tap");
    setReportItem(item);
    setSelectedReason(REPORT_REASONS[0]);
  };

  const submitReport = async () => {
    if (!reportItem) return;
    const item = reportItem;
    setReportItem(null);

    try {
      await api.reportQuestion({
        question: item.q,
        tag: item.tag,
        correct: item.correct,
        chosen: item.chosen,
        reason: selectedReason,
      });
      setReportedKeys((prev) => new Set(prev).add(item.q));
      SFX.play("coin");
      setDlg({
        emoji: "🙏",
        title: "Report Submitted",
        message: "Thank you for helping us keep GyanBlitz accurate! Our academic team will review this question.",
      });
    } catch {
      setDlg({
        emoji: "⚠️",
        title: "Couldn't send report",
        message: "Please try again in a moment.",
      });
    }
  };

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
          const alreadyReported = reportedKeys.has(r.q);

          return (
            <View key={i} style={[styles.card, r.ok ? styles.cardOk : styles.cardBad]}>
              <View style={styles.rowTop}>
                <Text style={styles.tag}>{r.tag}</Text>
                <View style={styles.badgeRow}>
                  <Text style={[styles.badge, r.ok ? styles.badgeOk : styles.badgeBad]}>
                    {r.ok ? "✓" : skipped ? "—" : "✗"}
                  </Text>
                </View>
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

              <View style={styles.cardFooter}>
                <Pressable
                  onPress={() => onOpenReport(r)}
                  disabled={alreadyReported}
                  style={[styles.reportBtn, alreadyReported && { opacity: 0.4 }]}
                  hitSlop={8}
                >
                  <Text style={styles.reportText}>
                    {alreadyReported ? "✓ Flagged" : "🚩 Report Question"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Report Modal */}
      {reportItem && (
        <Modal
          visible={!!reportItem}
          transparent
          animationType="fade"
          onRequestClose={() => setReportItem(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🚩 Report Question</Text>
              <Text style={styles.modalQuestion} numberOfLines={2}>
                "{reportItem.q}"
              </Text>
              <Text style={styles.modalSub}>What issue did you encounter?</Text>

              <View style={styles.reasonList}>
                {REPORT_REASONS.map((reason) => {
                  const sel = selectedReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => {
                        SFX.play("tap");
                        setSelectedReason(reason);
                      }}
                      style={[styles.reasonItem, sel && styles.reasonItemSel]}
                    >
                      <View style={[styles.radio, sel && styles.radioSel]} />
                      <Text style={[styles.reasonText, sel && styles.reasonTextSel]}>
                        {reason}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Pressable onPress={() => setReportItem(null)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitReport} style={styles.submitBtn}>
                  <Text style={styles.submitText}>Submit Report</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <AppDialog
        visible={!!dlg}
        emoji={dlg?.emoji}
        title={dlg?.title ?? ""}
        message={dlg?.message ?? ""}
        confirmText="OK"
        hideCancel
        onConfirm={() => setDlg(null)}
        onCancel={() => setDlg(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
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
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
    cardFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    reportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    reportText: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
    },
    modalBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: C.surface,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
    },
    modalTitle: {
      color: C.accent,
      fontWeight: "900",
      fontSize: 20,
      marginBottom: 6,
    },
    modalQuestion: {
      color: C.text,
      fontSize: 14,
      fontStyle: "italic",
      marginBottom: 12,
      opacity: 0.85,
    },
    modalSub: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 10,
    },
    reasonList: {
      gap: 8,
      marginBottom: 18,
    },
    reasonItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.surface2,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    reasonItemSel: {
      borderColor: C.accent,
      backgroundColor: "rgba(255,197,61,0.08)",
    },
    radio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: C.muted,
    },
    radioSel: {
      borderColor: C.accent,
      backgroundColor: C.accent,
    },
    reasonText: {
      color: C.text,
      fontSize: 14,
      fontWeight: "600",
    },
    reasonTextSel: {
      color: C.accent,
      fontWeight: "800",
    },
    modalActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.surface2,
      alignItems: "center",
    },
    cancelText: {
      color: C.muted,
      fontWeight: "800",
      fontSize: 14,
    },
    submitBtn: {
      flex: 1.5,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.accent,
      alignItems: "center",
    },
    submitText: {
      color: C.goldText,
      fontWeight: "900",
      fontSize: 14,
    },
  });
