import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import { daysLeft } from "../lib/league";
import { freeReward, premReward, PP_PER_TIER, PASS_TIERS, type PassReward } from "../lib/pass";
import { SKINS, goldGradient, useThemeC, type Palette } from "../theme";

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const rewardLabel = (r: PassReward) => (r.type === "coins" ? `${fmt(r.amount)} ₵` : `🎨 ${SKINS[r.id]?.name ?? r.id}`);

export default function SeasonPassScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { coins, pass, buyPass, claimPass, openStore, goHome } = useGame();
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<{ type: "coins" | "skin"; amount: number; skin: string | null } | null>(null);
  const [broke, setBroke] = useState(false);

  if (!pass) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </SafeAreaView>
    );
  }

  const intoTier = pass.tier >= PASS_TIERS ? PP_PER_TIER : pass.points - pass.tier * PP_PER_TIER;
  const pct = pass.tier >= PASS_TIERS ? 1 : intoTier / PP_PER_TIER;

  const onBuy = async () => {
    if (busy) return;
    setBusy(true);
    SFX.play("tap");
    const err = await buyPass();
    setBusy(false);
    if (err === "INSUFFICIENT_COINS") setBroke(true);
    else if (!err) SFX.play("win");
  };

  const onClaim = async (tier: number, premium: boolean) => {
    SFX.play("tap");
    const res = await claimPass(tier, premium);
    if (res) {
      SFX.play("coin");
      setReward({ type: res.reward_type, amount: res.reward_amount, skin: res.reward_skin });
    }
  };

  const Cell = ({ tier, premium }: { tier: number; premium: boolean }) => {
    const r = premium ? premReward(tier) : freeReward(tier);
    const claimed = (premium ? pass.prem_claimed : pass.free_claimed).includes(tier);
    const unlocked = tier <= pass.tier;
    const premLocked = premium && !pass.premium;
    const claimable = unlocked && !claimed && !premLocked;
    return (
      <Pressable
        disabled={!claimable}
        onPress={() => onClaim(tier, premium)}
        style={[
          styles.cell,
          premium && styles.cellPrem,
          claimable && styles.cellClaimable,
          claimed && styles.cellClaimed,
          !unlocked && styles.cellLocked,
        ]}
      >
        <Text style={[styles.cellText, claimed && { color: C.muted }]} numberOfLines={1}>
          {rewardLabel(r)}
        </Text>
        {claimed ? (
          <Text style={styles.cellTag}>✓ Claimed</Text>
        ) : claimable ? (
          <Text style={[styles.cellTag, { color: C.accent }]}>Tap to claim</Text>
        ) : premLocked && unlocked ? (
          <Text style={styles.cellTag}>🔒 Premium</Text>
        ) : (
          <Text style={styles.cellTag}>Tier {tier}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Pressable onPress={goHome} hitSlop={10}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.days}>⏳ {daysLeft(pass.season_ends)} days left</Text>
      </View>

      <Text style={styles.title}>Season Pass</Text>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.tierBig}>Tier {pass.tier}<Text style={styles.tierMax}> / {PASS_TIERS}</Text></Text>
          {pass.premium ? (
            <Text style={styles.premBadge}>★ PREMIUM</Text>
          ) : (
            <Text style={styles.freeBadge}>FREE TRACK</Text>
          )}
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.progressSub}>
          {pass.tier >= PASS_TIERS ? "Max tier reached! 🎉" : `${intoTier} / ${PP_PER_TIER} to Tier ${pass.tier + 1} · play any match to earn`}
        </Text>
      </View>

      {!pass.premium && (
        <Pressable onPress={onBuy} disabled={busy} style={{ marginBottom: 4 }}>
          <LinearGradient colors={goldGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.buy}>
            <Text style={styles.buyText}>Unlock Premium · {fmt(pass.price)} ₵</Text>
            <Text style={styles.buySub}>Exclusive skins + bigger coin rewards</Text>
          </LinearGradient>
        </Pressable>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.colTier}>TIER</Text>
        <Text style={styles.colHead}>FREE</Text>
        <Text style={styles.colHead}>★ PREMIUM</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {Array.from({ length: PASS_TIERS }, (_, i) => i + 1).map((tier) => (
          <View key={tier} style={styles.tierRow}>
            <View style={[styles.tierNum, tier <= pass.tier && styles.tierNumOn]}>
              <Text style={[styles.tierNumText, tier <= pass.tier && { color: C.goldText }]}>{tier}</Text>
            </View>
            <View style={styles.cellWrap}><Cell tier={tier} premium={false} /></View>
            <View style={styles.cellWrap}><Cell tier={tier} premium={true} /></View>
          </View>
        ))}
        <Text style={styles.note}>
          Premium unlocks with coins now; a real-money option arrives at launch.
        </Text>
      </ScrollView>

      <AppDialog
        visible={!!reward}
        emoji={reward?.type === "skin" ? "🎨" : "🪙"}
        title="Reward claimed!"
        message={
          reward
            ? reward.type === "skin"
              ? `You unlocked the ${SKINS[reward.skin ?? ""]?.name ?? "new"} theme! Equip it from your profile.`
              : `You got +${fmt(reward.amount)} ₵.`
            : ""
        }
        confirmText="Nice"
        hideCancel
        onConfirm={() => setReward(null)}
        onCancel={() => setReward(null)}
      />
      <AppDialog
        visible={broke}
        emoji="🔒"
        title="Not enough coins"
        message={`The premium pass costs ${fmt(pass.price)} ₵. Earn more or top up to unlock it.`}
        confirmText="Get coins"
        onConfirm={() => { setBroke(false); openStore(); }}
        onCancel={() => setBroke(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    center: { alignItems: "center", justifyContent: "center" },
    top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { color: C.muted, fontWeight: "800", fontSize: 16 },
    days: { color: C.accent, fontWeight: "800", fontSize: 14 },
    title: { color: C.accent, fontWeight: "900", fontSize: 30, marginTop: 10, marginBottom: 12 },
    progressCard: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
    progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    tierBig: { color: C.text, fontWeight: "900", fontSize: 22 },
    tierMax: { color: C.muted, fontWeight: "800", fontSize: 16 },
    premBadge: { color: C.accent, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
    freeBadge: { color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
    bar: { height: 10, borderRadius: 5, backgroundColor: C.line, overflow: "hidden" },
    barFill: { height: 10, borderRadius: 5, backgroundColor: C.accent },
    progressSub: { color: C.muted, fontSize: 12, fontWeight: "600" },
    buy: { borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 12 },
    buyText: { color: C.goldText, fontWeight: "900", fontSize: 17 },
    buySub: { color: "#5a3f00", fontWeight: "700", fontSize: 12, marginTop: 2 },
    headerRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 6, paddingHorizontal: 4 },
    colTier: { width: 38, color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1 },
    colHead: { flex: 1, color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1, textAlign: "center" },
    tierRow: { flexDirection: "row", alignItems: "stretch", gap: 8, marginBottom: 8 },
    tierNum: { width: 38, borderRadius: 10, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
    tierNumOn: { backgroundColor: C.accent },
    tierNumText: { color: C.muted, fontWeight: "900", fontSize: 16 },
    cellWrap: { flex: 1 },
    cell: { flex: 1, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, justifyContent: "center", gap: 3, minHeight: 56 },
    cellPrem: { borderColor: C.accent2 },
    cellClaimable: { borderColor: C.accent, borderWidth: 2, backgroundColor: C.surface2 },
    cellClaimed: { opacity: 0.55 },
    cellLocked: { opacity: 0.4 },
    cellText: { color: C.text, fontWeight: "800", fontSize: 14 },
    cellTag: { color: C.muted, fontWeight: "700", fontSize: 11 },
    note: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 14, fontStyle: "italic", lineHeight: 17 },
  });
