import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { goldGradient, useThemeC, type Palette } from "../theme";
import * as SFX from "../lib/sfx";

interface Props {
  visible: boolean;
  emoji?: string;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  hideCancel?: boolean; // info dialog: single button only
  destructive?: boolean; // confirm button shown in red (e.g. quit / forfeit)
  onConfirm: () => void;
  onCancel: () => void;
}

// Themed replacement for Alert.alert — matches the app palette in dark & light.
export default function AppDialog({
  visible,
  emoji,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  hideCancel = false,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const C = useThemeC();
  const styles = makeStyles(C);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* stop taps inside the card from dismissing */}
        <Pressable style={styles.card} onPress={() => {}}>
          {!!emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {!hideCancel && (
              <Pressable style={styles.cancel} onPress={() => { SFX.play("tap"); onCancel(); }}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable style={{ flex: hideCancel ? 1 : 1.4 }} onPress={() => { SFX.play("tap"); onConfirm(); }}>
              {destructive ? (
                <View style={[styles.confirm, styles.confirmDanger]}>
                  <Text style={styles.confirmDangerText}>{confirmText}</Text>
                </View>
              ) : (
                <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.confirm}>
                  <Text style={styles.confirmText}>{confirmText}</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 32 },
    card: {
      width: "100%", maxWidth: 360, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1,
      borderRadius: 22, padding: 24, alignItems: "center", gap: 10,
    },
    emoji: { fontSize: 40 },
    title: { color: C.text, fontWeight: "900", fontSize: 20, textAlign: "center" },
    message: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 6 },
    actions: { flexDirection: "row", gap: 10, marginTop: 6, width: "100%" },
    cancel: { flex: 1, backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    cancelText: { color: C.text, fontWeight: "800", fontSize: 15 },
    confirm: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    confirmText: { color: C.goldText, fontWeight: "900", fontSize: 15 },
    confirmDanger: { backgroundColor: C.wrong },
    confirmDangerText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  });
