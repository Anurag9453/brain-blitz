import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as api from "../lib/api";
import * as SFX from "../lib/sfx";
import Confetti from "../components/Confetti";
import { goldGradient, useThemeC, type Palette } from "../theme";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣"];

export default function FriendsResultScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { room, refreshRoom, leaveRoom, voteRematch, beginFriendsMatch, openReview } = useGame();
  const [voted, setVoted] = useState(false);
  const sawDone = useRef(false);
  const started = useRef(false);

  // Poll until the room settles; nudge a finalize once the clock is up.
  useEffect(() => {
    refreshRoom();
    const id = setInterval(() => {
      refreshRoom();
      const r = useGame.getState().room;
      if (r && r.status === "playing" && sawDone.current === false) api.finalizeRoom(r.id).catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, [refreshRoom]);

  // Once a round has settled, a flip back to "playing" means a rematch began.
  useEffect(() => {
    if (room?.status === "done") sawDone.current = true;
    if (room?.status === "playing" && sawDone.current && !started.current) {
      started.current = true;
      SFX.play("go");
      beginFriendsMatch();
    }
  }, [room?.status, beginFriendsMatch]);

  const done = room?.status === "done";
  const youWon = done && room?.winner === room?.you;
  const payout = done && youWon ? (room!.pot - room!.rake) : 0;

  useEffect(() => {
    if (done) SFX.play(youWon ? "win" : "coin");
  }, [done, youWon]);

  if (!room || !done) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={styles.waiting}>Tallying results…</Text>
        <Text style={styles.waitingSub}>Waiting for all players to finish.</Text>
      </SafeAreaView>
    );
  }

  const players = [...room.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Text style={styles.headline}>{youWon ? "YOU WIN! 🏆" : "RESULTS"}</Text>
      <View style={[styles.payBox, !youWon && styles.payBoxMuted]}>
        <Text style={[styles.payText, !youWon && { color: C.muted }]}>
          {youWon ? `🏆 You took the pot — +${room.pot - room.rake} ₵` : "Better luck next round!"}
        </Text>
        <Text style={styles.potText}>
          Pot {room.pot} ₵ · house fee {room.rake} ₵
        </Text>
      </View>

      <View style={{ gap: 8, marginTop: 8 }}>
        {players.map((p, i) => (
          <View key={p.user_id} style={[styles.row, p.user_id === room.you && styles.rowYou]}>
            <Text style={styles.place}>{MEDALS[(p.place ?? i + 1) - 1] ?? p.place}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {p.username}
              {p.user_id === room.you && <Text style={styles.youTag}>  YOU</Text>}
            </Text>
            <Text style={styles.score}>{p.score ?? 0}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.reviewBtn} onPress={() => { SFX.play("tap"); openReview(); }}>
        <Text style={styles.reviewText}>📋 Review answers</Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      {voted ? (
        <Text style={styles.waitVote}>Waiting for everyone to tap Play Again…</Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          style={styles.secondary}
          onPress={() => {
            SFX.play("tap");
            leaveRoom();
          }}
        >
          <Text style={styles.secondaryText}>Leave</Text>
        </Pressable>
        <Pressable
          style={{ flex: 1.4 }}
          disabled={voted}
          onPress={() => {
            SFX.play("tap");
            setVoted(true);
            voteRematch();
          }}
        >
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.primary, voted && { opacity: 0.5 }]}
          >
            <Text style={styles.primaryText}>{voted ? "Ready ✓" : "Play Again (100 ₵)"}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Confetti run={youWon} />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  center: { alignItems: "center", justifyContent: "center" },
  waiting: { color: C.text, fontWeight: "800", fontSize: 18, marginTop: 18 },
  waitingSub: { color: C.muted, fontSize: 14, marginTop: 6 },
  headline: { color: C.accent, fontWeight: "900", fontSize: 34, textAlign: "center", marginTop: 12 },
  payBox: { backgroundColor: C.coinPill, borderColor: C.coinBorder, borderWidth: 1, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 16 },
  payBoxMuted: { backgroundColor: C.surface, borderColor: C.line },
  payText: { color: C.accent, fontWeight: "800", fontSize: 17 },
  potText: { color: C.muted, fontSize: 13, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, borderColor: "transparent", borderWidth: 1 },
  rowYou: { borderColor: C.accent, backgroundColor: C.surface2 },
  place: { fontSize: 18, width: 30, textAlign: "center" },
  name: { flex: 1, color: C.text, fontWeight: "800", fontSize: 16 },
  youTag: { color: C.accent, fontWeight: "800", fontSize: 11 },
  score: { color: C.text, fontWeight: "900", fontSize: 18 },
  primary: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryText: { color: C.goldText, fontWeight: "900", fontSize: 16 },
  actions: { flexDirection: "row", gap: 10 },
  secondary: { flex: 1, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  secondaryText: { color: C.text, fontWeight: "800", fontSize: 16 },
  waitVote: { color: C.muted, fontWeight: "700", fontSize: 13, textAlign: "center", marginBottom: 10 },
  reviewBtn: { borderColor: C.line, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 14 },
  reviewText: { color: C.text, fontWeight: "800", fontSize: 15 },
});

