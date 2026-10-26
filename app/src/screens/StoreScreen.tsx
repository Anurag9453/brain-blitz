import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import RazorpayModal from "../components/RazorpayModal";
import { COIN_PACKS, CoinPack, RAZORPAY_KEY_ID } from "../lib/razorpay";
import * as api from "../lib/api";
import { goldGradient, useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export default function StoreScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { coins, closeStore, claimAd, completePurchase, username } = useGame();
  const [busy, setBusy] = useState(false);
  const [pendingPack, setPendingPack] = useState<CoinPack | null>(null);
  const [activePack, setActivePack] = useState<CoinPack | null>(null);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [dlg, setDlg] = useState<{ emoji?: string; title: string; message: string } | null>(null);

  const watchAd = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await claimAd();
      if (res.ok) {
        SFX.play("coin");
        setDlg({
          emoji: "🎬",
          title: "Reward earned!",
          message: `+${res.amount} ₵\n${res.remaining} ad rewards left today.`,
        });
      } else {
        setDlg({
          emoji: "⏳",
          title: "Daily limit reached",
          message: "Come back tomorrow for more ad rewards.",
        });
      }
    } catch {
      setDlg({
        emoji: "⚠️",
        title: "Couldn't load reward",
        message: "Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  };

  const buy = (pack: CoinPack) => {
    if (busy) return;
    SFX.play("tap");
    setPendingPack(pack);
  };

  const confirmAndProceedBuy = async () => {
    if (!pendingPack || busy) return;
    const pack = pendingPack;
    setPendingPack(null);
    SFX.play("tap");
    setBusy(true);

    try {
      // 1. Server-side order creation via Edge Function
      const order = await api.createRazorpayOrder(pack.id);
      setActiveOrder(order.order_id);
      setActiveKeyId(order.key_id);
      setActivePack(pack);
    } catch (err: any) {
      setDlg({
        emoji: "⚠️",
        title: "Order Failed",
        message:
          err.message ||
          "Could not initialize Razorpay order. Please ensure Edge Functions are deployed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onPaymentSuccess = async (payment: {
    paymentId: string;
    orderId?: string | null;
    signature?: string | null;
  }) => {
    if (!activePack) return;
    const pack = activePack;
    const orderId = payment.orderId || activeOrder;
    setActivePack(null);
    setActiveOrder(null);
    setBusy(true);

    if (!payment.signature || !orderId) {
      setDlg({
        emoji: "❌",
        title: "Verification Failed",
        message: "Missing cryptographic payment signature.",
      });
      setBusy(false);
      return;
    }

    try {
      const res = await completePurchase(
        pack.id,
        payment.paymentId,
        orderId,
        payment.signature
      );
      if (res.success) {
        SFX.play("coin");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setDlg({
          emoji: "🎉",
          title: "Coins Added!",
          message: `Successfully credited +${fmt(pack.coins)} ₵ to your balance.`,
        });
      } else {
        setDlg({
          emoji: "⚠️",
          title: "Verification Pending",
          message: "Payment received. Your coin balance will update shortly.",
        });
      }
    } catch (err: any) {
      setDlg({
        emoji: "⚠️",
        title: "Signature Verification Failed",
        message: err.message || "Payment could not be verified by server.",
      });
    } finally {
      setBusy(false);
    }
  };

  const onPaymentFailure = (reason: string) => {
    setActivePack(null);
    setActiveOrder(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setDlg({
      emoji: "❌",
      title: "Payment Cancelled",
      message: reason || "Your account was not charged.",
    });
  };

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
      <View style={styles.titleRow}>
        <Text style={styles.title}>Get Coins</Text>
        {RAZORPAY_KEY_ID.startsWith("rzp_test") && (
          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>Test Mode</Text>
          </View>
        )}
      </View>

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

        <Text style={styles.section}>COIN PACKS (RAZORPAY / UPI / CARDS)</Text>
        {COIN_PACKS.map((p) => (
          <Pressable key={p.id} onPress={() => buy(p)} style={styles.packCard}>
            <View style={styles.coinDotBig}>
              <Text style={styles.coinDotBigText}>₵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.packCoins}>{fmt(p.coins)} coins</Text>
              <Text style={styles.packSub}>{p.label}</Text>
            </View>
            <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.priceBtn}>
              <Text style={styles.priceText}>₹{p.priceInr}</Text>
            </LinearGradient>
          </Pressable>
        ))}
        <Text style={styles.note}>
          💳 Payments powered by Razorpay. Supports UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Wallets.
        </Text>
      </ScrollView>

      {activePack && (
        <RazorpayModal
          visible={!!activePack}
          packName={activePack.label}
          amountInr={activePack.priceInr}
          orderId={activeOrder}
          keyId={activeKeyId}
          username={username || "Player"}
          onSuccess={onPaymentSuccess}
          onCancel={() => {
            setActivePack(null);
            setActiveOrder(null);
            setActiveKeyId(null);
          }}
          onFailure={onPaymentFailure}
        />
      )}

      <AppDialog
        visible={!!pendingPack}
        emoji="👨‍👩‍👧"
        title="Parent / Adult Confirmation"
        message={
          pendingPack
            ? `Purchase ${pendingPack.label} for ₹${pendingPack.priceInr}?\n\nVirtual coins have no real-world monetary value and cannot be cashed out. Players under 18 must have parent or guardian approval.`
            : ""
        }
        confirmText="Approved · Continue"
        cancelText="Cancel"
        onConfirm={confirmAndProceedBuy}
        onCancel={() => setPendingPack(null)}
      />

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
    coins: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: C.coinPill,
      borderColor: C.coinBorder,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    coinDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    coinDotText: { color: "#7a5410", fontWeight: "900", fontSize: 11 },
    coinVal: { color: C.accent, fontWeight: "800", fontSize: 16 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
      marginBottom: 12,
    },
    title: { color: C.accent, fontWeight: "900", fontSize: 30 },
    testBadge: {
      backgroundColor: C.surface2,
      borderColor: C.accent,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    testBadgeText: { color: C.accent, fontSize: 11, fontWeight: "800" },
    section: {
      color: C.muted,
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 1.5,
      marginTop: 16,
      marginBottom: 10,
    },
    adCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: C.surface,
      borderColor: C.accent2,
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
    },
    adEmoji: { fontSize: 30 },
    adTitle: { color: C.text, fontWeight: "800", fontSize: 17 },
    adSub: { color: C.muted, fontSize: 13, marginTop: 2 },
    adGet: { color: C.accent2, fontWeight: "900", fontSize: 16 },
    packCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: C.surface,
      borderColor: C.line,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    coinDotBig: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    coinDotBigText: { color: "#7a5410", fontWeight: "900", fontSize: 18 },
    packCoins: { color: C.text, fontWeight: "800", fontSize: 17 },
    packSub: { color: C.muted, fontSize: 12, marginTop: 2 },
    priceBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
    priceText: { color: C.goldText, fontWeight: "900", fontSize: 15 },
    note: {
      color: C.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 18,
      fontStyle: "italic",
    },
  });
