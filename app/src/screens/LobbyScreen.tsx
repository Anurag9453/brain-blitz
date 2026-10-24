import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import * as SFX from "../lib/sfx";
import { goldGradient, useThemeC, type Palette } from "../theme";

export default function LobbyScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { room, refreshRoom, startRoomGame, beginFriendsMatch, leaveRoom, error } = useGame();
  const started = useRef(false);

  // Poll the room every 1.5s for joins / start.
  useEffect(() => {
    refreshRoom();
    const id = setInterval(refreshRoom, 1500);
    return () => clearInterval(id);
  }, [refreshRoom]);

  // When the host starts, everyone flips into the match.
  useEffect(() => {
    if (room?.status === "playing" && !started.current) {
      started.current = true;
      SFX.play("go");
      beginFriendsMatch();
    }
  }, [room?.status, beginFriendsMatch]);

  const players = room?.players ?? [];
  const canStart = room?.is_host && players.length >= 2;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable onPress={leaveRoom} hitSlop={10}>
        <Text style={styles.back}>‹ Leave</Text>
      </Pressable>

      <Text style={styles.label}>ROOM CODE</Text>
      <Text style={styles.code}>{room?.code ?? "······"}</Text>
      <Text style={styles.share}>Share this code with friends so they can join.</Text>
      {!!room?.subject && (
        <Text style={styles.subject}>
          {room.subject === "gk" ? "General Knowledge" : room.subject.charAt(0).toUpperCase() + room.subject.slice(1)} ·{Math.round((room.duration_seconds ?? 120) / 60)}-min match
        </Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={[styles.label, { marginTop: 24 }]}>PLAYERS ({players.length}/4)</Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        {players.map((p) => (
          <View key={p.user_id} style={[styles.player, p.user_id === room?.you && styles.playerYou]}>
            <Text style={styles.avatar}>{p.username.slice(0, 1).toUpperCase()}</Text>
            <Text style={styles.pname}>
              {p.username}
              {p.user_id === room?.you && <Text style={styles.youTag}>  YOU</Text>}
              {p.user_id === room?.winner && ""}
            </Text>
            {p.user_id === room?.host && <Text style={styles.hostTag}>HOST</Text>}
          </View>
        ))}
        {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
          <View key={`e${i}`} style={[styles.player, styles.empty]}>
            <Text style={styles.pnameMuted}>Waiting…</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {room?.is_host ? (
        <Pressable
          disabled={!canStart}
          onPress={() => {
            SFX.play("tap");
            startRoomGame();
          }}
        >
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.primary, !canStart && { opacity: 0.5 }]}
          >
            <Text style={styles.primaryText}>{players.length < 2 ? "Need 2+ players" : "Start Game"}</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <Text style={styles.waiting}>Waiting for the host to start…</Text>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  back: { color: C.muted, fontWeight: "800", fontSize: 16 },
  label: { color: C.muted, fontWeight: "800", fontSize: 12, letterSpacing: 1.5, marginTop: 18 },
  code: { color: C.accent, fontWeight: "900", fontSize: 52, letterSpacing: 8, textAlign: "center", marginTop: 6 },
  share: { color: C.muted, fontSize: 13, textAlign: "center", marginTop: 4 },
  subject: { color: C.accent2, fontSize: 13, fontWeight: "800", textAlign: "center", marginTop: 4 },
  error: { color: C.wrong, fontSize: 13, fontWeight: "700", marginTop: 12, textAlign: "center" },
  player: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1.5, borderRadius: 14, padding: 12 },
  playerYou: { borderColor: C.accent },
  empty: { borderStyle: "dashed", opacity: 0.6 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface2, color: C.text, textAlign: "center", lineHeight: 34, fontWeight: "900", overflow: "hidden" },
  pname: { flex: 1, color: C.text, fontWeight: "800", fontSize: 16 },
  pnameMuted: { flex: 1, color: C.muted, fontWeight: "700", fontSize: 15, marginLeft: 4 },
  youTag: { color: C.accent, fontWeight: "800", fontSize: 11 },
  hostTag: { color: C.accent2, fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  primary: { borderRadius: 16, paddingVertical: 17, alignItems: "center" },
  primaryText: { color: C.goldText, fontWeight: "900", fontSize: 18 },
  waiting: { color: C.muted, fontWeight: "700", fontSize: 15, textAlign: "center", paddingVertical: 18 },
});
