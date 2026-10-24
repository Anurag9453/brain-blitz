import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import { tierMeta } from "../lib/league";
import { SKINS, DARK, LIGHT, useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

type Item = {
  id: string;
  name: string;
  kind: "default" | "skin";
  mode?: "dark" | "light";
  palette: Palette;
  price: number;
  minTier: number;
};

const CATALOG: Item[] = [
  { id: "default-dark", name: "Midnight", kind: "default", mode: "dark", palette: DARK, price: 0, minTier: 1 },
  { id: "default-light", name: "Daylight", kind: "default", mode: "light", palette: LIGHT, price: 0, minTier: 1 },
  ...Object.values(SKINS).map((s) => ({
    id: s.id, name: s.name, kind: "skin" as const, palette: s.palette, price: s.price, minTier: s.minTier,
  })),
];

export default function LockerScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { coins, skin, theme, ownedSkins, leagueTier, equipSkin, equipDefault, unlockSkin, openStore, goHome } = useGame();
  const [dlg, setDlg] = useState<null | "broke" | "error">(null);

  const isEquipped = (c: Item) =>
    c.kind === "default" ? skin === "default" && theme === c.mode : skin === c.id;
  const isOwned = (c: Item) => (c.kind === "default" ? true : ownedSkins.includes(c.id));
  const isTierLocked = (c: Item) => c.kind === "skin" && !isOwned(c) && leagueTier < c.minTier;

  const onPress = async (c: Item) => {
    if (isEquipped(c) || isTierLocked(c)) return;
    if (c.kind === "default") {
      SFX.play("tap");
      equipDefault(c.mode!);
      return;
    }
    if (isOwned(c)) {
      SFX.play("tap");
      equipSkin(c.id);
      return;
    }
    SFX.play("tap");
    const err = await unlockSkin(c.id);
    if (err === "INSUFFICIENT_COINS") setDlg("broke");
    else if (err) setDlg("error");
    else SFX.play("coin");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Pressable onPress={goHome} hitSlop={10}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Pressable style={styles.coins} onPress={() => { SFX.play("tap"); openStore(); }}>
          <View style={styles.coinDot}>
            <Text style={styles.coinDotText}>₵</Text>
          </View>
          <Text style={styles.coinVal}>{fmt(coins)}</Text>
          <Text style={styles.coinPlus}>＋</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Customize</Text>
      <Text style={styles.subtitle}>Pick a theme to change how your whole game looks.</Text>

      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {CATALOG.map((c) => {
          const equipped = isEquipped(c);
          const owned = isOwned(c);
          const tierLocked = isTierLocked(c);
          return (
            <Pressable
              key={c.id}
              onPress={() => onPress(c)}
              disabled={equipped || tierLocked}
              style={[styles.card, equipped && styles.cardOn]}
            >
              <LinearGradient colors={c.palette.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
                <View style={[styles.dot, { backgroundColor: c.palette.accent }]} />
                <View style={[styles.dot, { backgroundColor: c.palette.accent2 }]} />
              </LinearGradient>

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.meta}>
                  {c.kind === "default"
                    ? "Free · default"
                    : tierLocked
                    ? `Reach ${tierMeta(c.minTier).name} league`
                    : owned
                    ? "Owned"
                    : `${fmt(c.price)} ₵`}
                </Text>
              </View>

              <View
                style={[
                  styles.btn,
                  equipped && styles.btnEquipped,
                  tierLocked && styles.btnLocked,
                  !owned && !tierLocked && styles.btnBuy,
                ]}
              >
                <Text style={[styles.btnText, equipped && styles.btnTextEquipped, !owned && !tierLocked && styles.btnTextBuy]}>
                  {equipped ? "Equipped ✓" : tierLocked ? `🔒 ${tierMeta(c.minTier).emoji}` : owned ? "Equip" : "Unlock"}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Text style={styles.note}>More cosmetics (avatars, frames) coming soon. 🎨</Text>
      </ScrollView>

      <AppDialog
        visible={dlg === "broke"}
        emoji="🔒"
        title="Not enough coins"
        message="You don't have enough coins for this theme yet. Earn more or top up to unlock it."
        confirmText="Get coins"
        onConfirm={() => { setDlg(null); openStore(); }}
        onCancel={() => setDlg(null)}
      />
      <AppDialog
        visible={dlg === "error"}
        emoji="⚠️"
        title="Couldn't unlock"
        message="Something went wrong. Please try again in a moment."
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
    coins: {
      flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.coinPill,
      borderColor: C.coinBorder, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
    },
    coinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
    coinDotText: { color: "#7a5410", fontWeight: "900", fontSize: 11 },
    coinVal: { color: C.accent, fontWeight: "800", fontSize: 16 },
    coinPlus: { color: C.accent, fontWeight: "900", fontSize: 16, marginLeft: 2 },
    title: { color: C.accent, fontWeight: "900", fontSize: 30, marginTop: 12 },
    subtitle: { color: C.muted, fontSize: 14, marginTop: 4 },
    card: {
      flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface,
      borderColor: C.line, borderWidth: 1.5, borderRadius: 16, padding: 12,
    },
    cardOn: { borderColor: C.accent },
    preview: { width: 60, height: 60, borderRadius: 12, flexDirection: "row", alignItems: "flex-end", gap: 5, padding: 8 },
    dot: { width: 12, height: 12, borderRadius: 6 },
    name: { color: C.text, fontWeight: "800", fontSize: 17 },
    meta: { color: C.muted, fontSize: 13, marginTop: 2 },
    btn: { backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, minWidth: 86, alignItems: "center" },
    btnEquipped: { backgroundColor: "transparent", borderColor: C.accent },
    btnLocked: { opacity: 0.7 },
    btnBuy: { backgroundColor: C.accent, borderColor: C.accent },
    btnText: { color: C.text, fontWeight: "800", fontSize: 14 },
    btnTextEquipped: { color: C.accent },
    btnTextBuy: { color: C.goldText, fontWeight: "900" },
    note: { color: C.muted, fontSize: 13, textAlign: "center", marginTop: 14, fontStyle: "italic" },
  });
