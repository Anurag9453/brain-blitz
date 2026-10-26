import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../state/store";
import type { SubjectSel } from "../state/store";
import * as SFX from "../lib/sfx";
import AppDialog from "../components/AppDialog";
import DailyDialog from "../components/DailyDialog";
import AccountModal from "../components/AccountModal";
import { nextQuestion } from "../engine";
import { poolFor } from "../engine/generators";
import type { Question } from "../engine/options";
import { accountLevel } from "../lib/level";
import { tierMeta } from "../lib/league";
import { goldGradient, useThemeC, type Palette } from "../theme";

const SUBJECTS: { key: SubjectSel; label: string }[] = [
  { key: "mixed", label: "Mixed" },
  { key: "maths", label: "Maths" },
  { key: "physics", label: "Physics" },
  { key: "chemistry", label: "Chem" },
  { key: "gk", label: "GK" },
];

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
// Thousands separator (Hermes-safe — no reliance on Intl).
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
// Player-facing difficulty labels (we don't expose school-class names).
const DIFFICULTY = ["Warm-up", "Easy", "Medium", "Hard", "Expert", "Master"];

export default function HomeScreen() {
  const C = useThemeC();
  const styles = makeStyles(C);
  const { coins, levels, progress, selLevel, selectLevel, goModes, error, soundOn, toggleSound, theme, toggleTheme, dailyAvailable, claimDaily, subject, setSubject, username, xp, winStreak, leagueTier, leaguePoints, league, seasonResult, clearSeasonResult, openLeague, openLocker, pass, openPass, openHowTo, openStore, authUser } =
    useGame();
  const acct = accountLevel(xp);
  const tier = tierMeta(leagueTier);
  const seasonTier = seasonResult ? tierMeta(seasonResult.to_tier) : null;

  const [dailyQ, setDailyQ] = useState<Question | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const onClaimDaily = () => {
    SFX.play("tap");
    // A fresh, approachable mixed-subject question each time the challenge opens.
    setDailyQ(nextQuestion(poolFor([7, 8])));
  };
  const [showLock, setShowLock] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const [w, setW] = useState(Math.min(Dimensions.get("window").width, 480) - 40);
  const [h, setH] = useState(0);
  const didInit = useRef(false);

  // Open on Level 1 the first time the home screen mounts.
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      selectLevel(1);
      requestAnimationFrame(() => scroller.current?.scrollTo({ x: 0, animated: false }));
    }
  }, [selectLevel]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!w) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / w);
    const n = Math.min(levels.length, Math.max(1, idx + 1));
    if (n !== selLevel) selectLevel(n);
  };

  const level = levels[selLevel - 1];
  const broke = level ? coins < level.fee : true;
  const canPlay = !!level && !broke;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topbar}>
        <Pressable style={styles.profile} onPress={() => { SFX.play("tap"); openLocker(); }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(username || "P").charAt(0).toUpperCase()}</Text>
            <View style={styles.lvBadge}>
              <Text style={styles.lvBadgeText}>{acct.level}</Text>
            </View>
          </View>
          <View style={styles.profileText}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {username || "Player"}
              </Text>
              <Pressable
                onPress={() => { SFX.play("tap"); setShowAccount(true); }}
                style={[styles.accountChip, authUser?.isAnonymous ? styles.accountChipGuest : styles.accountChipSaved]}
                hitSlop={6}
              >
                <Text style={[styles.accountChipText, authUser?.isAnonymous ? styles.accountChipGuestText : styles.accountChipSavedText]}>
                  {authUser?.isAnonymous ? "Save 💾" : "Saved ✓"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.lvText}>LV {acct.level}</Text>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${Math.round(acct.pct * 100)}%` }]} />
              </View>
            </View>
          </View>
        </Pressable>
        <View style={styles.topRight}>
          <Pressable onPress={() => { SFX.play("tap"); openHowTo(); }} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.iconTxt}>?</Text>
          </Pressable>
          <Pressable onPress={toggleSound} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.iconTxt}>{soundOn ? "🔊" : "🔈"}</Text>
          </Pressable>
          <Pressable onPress={() => { SFX.play("tap"); toggleTheme(); }} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.iconTxt}>{theme === "dark" ? "☀️" : "🌙"}</Text>
          </Pressable>
          <Pressable
            style={styles.coins}
            onPress={() => {
              SFX.play("tap");
              openStore();
            }}
          >
            <View style={styles.coinDot}>
              <Text style={styles.coinDotText}>₵</Text>
            </View>
            <Text style={styles.coinVal}>{coins}</Text>
            <Text style={styles.coinPlus}>＋</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>GYAN BLITZ</Text>
        {winStreak >= 2 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakChipText}>🔥 {winStreak} win streak</Text>
          </View>
        )}
      </View>

      <View style={styles.subjects}>
        {SUBJECTS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => {
              SFX.play("tap");
              setSubject(s.key);
            }}
            style={[styles.pill, subject === s.key && styles.pillOn]}
          >
            <Text style={[styles.pillText, subject === s.key && styles.pillTextOn]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[styles.league, { borderColor: tier.color }]} onPress={() => { SFX.play("tap"); openLeague(); }}>
        <Text style={styles.leagueEmoji}>{tier.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leagueName, { color: tier.color }]}>{tier.name} League</Text>
          <Text style={styles.leagueSub}>
            {fmt(leaguePoints)} LP this week{league ? ` · rank #${league.rank}` : ""}
          </Text>
        </View>
        <Text style={styles.leagueArrow}>›</Text>
      </Pressable>

      <Pressable style={styles.pass} onPress={() => { SFX.play("tap"); openPass(); }}>
        <Text style={styles.passEmoji}>🎟️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.passName}>Season Pass{pass?.premium ? "  ★" : ""}</Text>
          <Text style={styles.passSub}>{pass ? `Tier ${pass.tier} / ${pass.tiers} · rewards to claim` : "Earn rewards every match"}</Text>
        </View>
        <Text style={styles.leagueArrow}>›</Text>
      </Pressable>

      {dailyAvailable && (
        <Pressable style={styles.daily} onPress={onClaimDaily}>
          <Text style={styles.dailyText}>🎁  Daily challenge — answer & win</Text>
          <Text style={styles.dailyArrow}>›</Text>
        </Pressable>
      )}

      <View
        style={styles.carouselWrap}
        onLayout={(e) => {
          setW(e.nativeEvent.layout.width);
          setH(e.nativeEvent.layout.height);
        }}
      >
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {levels.map((lvl) => {
            const locked = coins < lvl.fee;
            const best = progress[lvl.n]?.stars ?? 0;
            return (
              <View key={lvl.n} style={{ width: w, height: h, justifyContent: "center", paddingVertical: 4 }}>
                <View style={[styles.card, locked && styles.cardLocked]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.bigNum, !locked && styles.bigNumActive]}>
                      <Text style={[styles.bigNumText, !locked && { color: C.goldText }]}>
                        {locked ? "🔒" : lvl.n}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{lvl.name}</Text>
                      <Text style={styles.cardBand}>{DIFFICULTY[lvl.n - 1] ?? `Level ${lvl.n}`}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardStars}>
                    {[0, 1, 2].map((i) => (
                      <Text key={i} style={{ color: i < best ? C.accent : C.line }}>
                        ★
                      </Text>
                    ))}
                  </Text>

                  <View style={styles.cardChips}>
                    <View style={styles.cChip}>
                      <Text style={styles.cChipText}>⏱ {mmss(lvl.time)}</Text>
                    </View>
                    <View style={styles.cChip}>
                      <Text style={styles.cChipText}>entry {fmt(lvl.fee)} ₵</Text>
                    </View>
                  </View>

                  {locked && (
                    <Text style={styles.lockHint}>
                      🔒 Reach {fmt(lvl.fee)} ₵ to unlock — win coins in lower levels
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.dots}>
        {levels.map((l) => (
          <View key={l.n} style={[styles.dot, l.n === selLevel && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.swipeHint}>‹ swipe to browse levels ›</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={() => {
          SFX.play("tap");
          if (broke && level) {
            setShowLock(true);
            return;
          }
          goModes();
        }}
        disabled={!level}
      >
        <LinearGradient
          colors={goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.play, !canPlay && { opacity: 0.5 }]}
        >
          <Text style={styles.playText}>
            {broke ? `Need ${fmt(level.fee)} ₵ to unlock` : `Play ${level?.name ?? ""}`}
          </Text>
          {canPlay && <Text style={styles.playSub}>Choose your mode →</Text>}
        </LinearGradient>
      </Pressable>

      <AppDialog
        visible={showLock}
        emoji="🔒"
        title="Not enough coins"
        message={level ? `${level.name} costs ${fmt(level.fee)} ₵ to enter. Get more coins to unlock it.` : ""}
        confirmText="Get coins"
        onConfirm={() => { setShowLock(false); openStore(); }}
        onCancel={() => setShowLock(false)}
      />

      <DailyDialog
        visible={dailyQ !== null}
        question={dailyQ}
        onSubmit={(correct) => claimDaily(correct)}
        onClose={() => setDailyQ(null)}
      />

      <AccountModal
        visible={showAccount}
        onClose={() => setShowAccount(false)}
      />

      <AppDialog
        visible={!!seasonResult && seasonResult.outcome !== "stayed"}
        emoji={seasonTier?.emoji}
        title={
          seasonResult?.outcome === "promoted"
            ? `Promoted to ${seasonTier?.name}! 🎉`
            : `Relegated to ${seasonTier?.name}`
        }
        message={
          seasonResult
            ? seasonResult.outcome === "promoted"
              ? `You finished #${seasonResult.rank} last week. Welcome to the ${seasonTier?.name} League — keep climbing!`
              : `You finished #${seasonResult.rank} last week. Win matches to climb back up this week!`
            : ""
        }
        confirmText="Let's go"
        hideCancel
        onConfirm={() => { clearSeasonResult(); openLeague(); }}
        onCancel={clearSeasonResult}
      />
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  profile: { flexDirection: "row", alignItems: "center", gap: 9, flexShrink: 1, marginRight: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent2, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 17 },
  lvBadge: {
    position: "absolute", bottom: -3, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3,
    backgroundColor: C.accent, borderColor: C.ground, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  lvBadgeText: { color: C.goldText, fontWeight: "900", fontSize: 10 },
  profileText: { flexShrink: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: { color: C.text, fontWeight: "800", fontSize: 15, flexShrink: 1 },
  accountChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  accountChipGuest: {
    backgroundColor: "rgba(255,197,61,0.12)",
    borderColor: C.accent,
  },
  accountChipSaved: {
    backgroundColor: "rgba(61,220,151,0.12)",
    borderColor: C.correct,
  },
  accountChipText: {
    fontSize: 9,
    fontWeight: "800",
  },
  accountChipGuestText: {
    color: C.accent,
  },
  accountChipSavedText: {
    color: C.correct,
  },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lvText: { color: C.muted, fontWeight: "800", fontSize: 10, letterSpacing: 0.5 },
  xpTrack: { width: 64, height: 5, borderRadius: 3, backgroundColor: C.line, overflow: "hidden" },
  xpFill: { height: 5, borderRadius: 3, backgroundColor: C.accent },
  streakChip: {
    flexDirection: "row", alignItems: "center", marginTop: 6, backgroundColor: C.coinPill,
    borderColor: C.coinBorder, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12,
  },
  streakChipText: { color: C.accent, fontWeight: "800", fontSize: 13 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconTxt: { fontSize: 16, color: C.text, fontWeight: "800" },
  coins: {
    flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.coinPill,
    borderColor: C.coinBorder, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  coinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  coinDotText: { color: "#7a5410", fontWeight: "900", fontSize: 11 },
  coinVal: { color: C.accent, fontWeight: "800", fontSize: 16 },
  coinPlus: { color: C.accent, fontWeight: "900", fontSize: 16, marginLeft: 2 },
  hero: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  kicker: { color: C.accent2, fontWeight: "800", fontSize: 12, letterSpacing: 2 },
  title: { color: C.accent, fontWeight: "900", fontSize: 36, letterSpacing: -1, marginTop: 4 },
  subjects: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 },
  pill: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  pillOn: { backgroundColor: C.accent2, borderColor: C.accent2 },
  pillText: { color: C.muted, fontWeight: "800", fontSize: 13 },
  pillTextOn: { color: "#fff" },

  carouselWrap: { flex: 1, marginTop: 6 },
  card: {
    backgroundColor: C.surface, borderColor: C.accent, borderWidth: 1.5,
    borderRadius: 16, padding: 14, gap: 12,
  },
  cardLocked: { borderColor: C.line, opacity: 0.7 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  bigNum: { width: 40, height: 40, borderRadius: 11, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  bigNumActive: { backgroundColor: C.accent },
  bigNumText: { color: C.muted, fontWeight: "900", fontSize: 18 },
  cardName: { color: C.text, fontWeight: "900", fontSize: 19 },
  cardBand: { color: C.muted, fontSize: 13, marginTop: 1 },
  cardStars: { fontSize: 20, letterSpacing: 5, textAlign: "center" },
  cardChips: { flexDirection: "row", gap: 8, justifyContent: "center" },
  cChip: { backgroundColor: C.surface2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  cChipText: { color: C.text, fontWeight: "700", fontSize: 13 },
  prizes: { backgroundColor: C.surface2, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  prizesLabel: { color: C.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1.5, marginBottom: 2 },
  payLine: { color: C.text, fontWeight: "700", fontSize: 14, textAlign: "center" },
  payHi: { color: C.accent, fontWeight: "900" },
  payMuted: { color: C.muted, fontWeight: "700", fontSize: 13, textAlign: "center" },
  lockHint: { color: C.muted, fontSize: 13, textAlign: "center", fontWeight: "700" },
  daily: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.coinPill, borderColor: C.coinBorder, borderWidth: 1, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16, marginTop: 8,
  },
  dailyText: { color: C.accent, fontWeight: "800", fontSize: 15 },
  dailyArrow: { color: C.accent, fontWeight: "900", fontSize: 20 },
  league: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface,
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12,
  },
  leagueEmoji: { fontSize: 26 },
  leagueName: { fontWeight: "900", fontSize: 15 },
  leagueSub: { color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 1 },
  leagueArrow: { color: C.muted, fontWeight: "900", fontSize: 20 },
  pass: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface,
    borderColor: C.accent2, borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 10,
  },
  passEmoji: { fontSize: 26 },
  passName: { color: C.accent2, fontWeight: "900", fontSize: 15 },
  passSub: { color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 1 },

  dots: { flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  dotActive: { backgroundColor: C.accent, width: 20 },
  swipeHint: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 8, fontWeight: "600" },

  error: { color: C.wrong, fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 8 },
  play: { borderRadius: 18, paddingVertical: 17, alignItems: "center", marginTop: 10 },
  playText: { color: C.goldText, fontWeight: "900", fontSize: 19 },
  playSub: { color: "#5a3f00", fontWeight: "700", fontSize: 12, marginTop: 3 },
  lowcoin: { color: C.wrong, fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 8 },
});
