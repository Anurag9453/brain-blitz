import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Localization from "expo-localization";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import { goldGradient, useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Indicative price points per currency (mirrors typical app-store tiers).
// At launch these are replaced by the store's own localized price strings.
const PRICES: Record<string, { sym: string; amts: number[] }> = {
  USD: { sym: "$", amts: [0.99, 1.99, 4.99, 9.99] },
  INR: { sym: "₹", amts: [89, 179, 449, 899] },
  EUR: { sym: "€", amts: [0.99, 1.99, 4.99, 9.99] },
  GBP: { sym: "£", amts: [0.99, 1.99, 4.99, 9.99] },
  AUD: { sym: "A$", amts: [1.49, 2.99, 7.99, 14.99] },
  CAD: { sym: "C$", amts: [1.39, 2.79, 6.99, 13.99] },
  AED: { sym: "AED ", amts: [3.99, 7.99, 18.99, 36.99] },
  SGD: { sym: "S$", amts: [1.48, 2.98, 6.98, 13.98] },
};
const CURRENCY = Localization.getLocales()[0]?.currencyCode ?? "USD";
const PRICING = PRICES[CURRENCY] ?? PRICES.USD;
const priceAt = (i: number) => {
  const a = PRICING.amts[i];
  return `${PRICING.sym}${Number.isInteger(a) ? a : a.toFixed(2)}`;
};

const PACKS = [{ coins: 500 }, { coins: 1200 }, { coins: 3000 }, { coins: 7000 }];

export default function StoreScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { coins, closeStore, claimAd } = useGame();
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<{ emoji?: string; title: string; message: string } | null>(null);

  const watchAd = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await claimAd();
      if (res.ok) {
        SFX.play("coin");
        setDlg({ emoji: "🎬", title: "Reward earned!", message: `+${res.amount} ₵\n${res.remaining} ad rewards left today.` });
      } else {
        setDlg({ emoji: "⏳", title: "Daily limit reached", message: "Come back tomorrow for more ad rewards." });
      }
    } catch {
      setDlg({ emoji: "⚠️", title: "Couldn't load reward", message: "Please try again in a moment." });
    } finally {
      setBusy(false);
    }
  };

  const buy = () =>
    setDlg({ emoji: "🚀", title: "Coming at launch", message: "Coin purchases activate once the app is published to the stores." });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Pressable onPress={closeStore} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <View style={styles.coins}>
          <View style={styles.coinDot}>
            <Text style={styles.coinDotText}>₵</Text>
          </View>
          <Text style={styles.coinVal}>{fmt(coins)}</Text>
        </View>
      </View>
      <Text style={styles.title}>Get Coins</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>FREE</Text>
        <Pressable onPress={watchAd} disabled={busy} style={[styles.adCard, busy && { opacity: 0.6 }]}>
          <Text style={styles.adEmoji}>🎬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.adTitle}>Watch an ad</Text>
            <Text style={styles.adSub}>Earn 50 ₵ — up to 5 times a day</Text>
          </View>
          <Text style={styles.adGet}>+50 ₵</Text>
        </Pressable>

        <Text style={styles.section}>COIN PACKS</Text>
        {PACKS.map((p, i) => (
          <Pressable key={p.coins} onPress={buy} style={styles.packCard}>
            <View style={styles.coinDotBig}>
              <Text style={styles.coinDotBigText}>₵</Text>
            </View>
            <Text style={styles.packCoins}>{fmt(p.coins)} coins</Text>
            <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.priceBtn}>
              <Text style={styles.priceText}>{priceAt(i)}</Text>
            </LinearGradient>
          </Pressable>
        ))}
        <Text style={styles.note}>
          💡 Prices shown in {CURRENCY}. In this test build the ad reward is granted instantly (no real ad) and coin
          purchases are disabled — at launch the store shows each player exact prices in their own currency.
        </Text>
      </ScrollView>

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

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: C.muted, fontWeight: "800", fontSize: 16 },
  coins: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.coinPill, borderColor: C.coinBorder, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  coinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  coinDotText: { color: "#7a5410", fontWeight: "900", fontSize: 11 },
  coinVal: { color: C.accent, fontWeight: "800", fontSize: 16 },
  title: { color: C.accent, fontWeight: "900", fontSize: 30, marginTop: 12, marginBottom: 12 },
  section: { color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginTop: 16, marginBottom: 10 },
  adCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface, borderColor: C.accent2, borderWidth: 1.5, borderRadius: 16, padding: 16 },
  adEmoji: { fontSize: 30 },
  adTitle: { color: C.text, fontWeight: "800", fontSize: 17 },
  adSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  adGet: { color: C.accent2, fontWeight: "900", fontSize: 16 },
  packCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  coinDotBig: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  coinDotBigText: { color: "#7a5410", fontWeight: "900", fontSize: 18 },
  packCoins: { flex: 1, color: C.text, fontWeight: "800", fontSize: 17 },
  priceBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  priceText: { color: C.goldText, fontWeight: "900", fontSize: 15 },
  note: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 18, fontStyle: "italic" },
});
