import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Logo from "../components/Logo";
import { useThemeC, type Palette } from "../theme";

// "GYAN" drops from the top, "BLITZ" rises from the bottom, they meet in the
// middle, bounce twice, then the logo (a book + lightning) pops in.
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const C = useThemeC();
  const styles = makeStyles(C);
  const gyanY = useRef(new Animated.Value(-280)).current;
  const blitzY = useRef(new Animated.Value(280)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const logo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(gyanY, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.spring(blitzY, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      // two little jumps after they meet
      Animated.timing(hop, { toValue: -24, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, useNativeDriver: true }),
      Animated.timing(hop, { toValue: -12, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 5, useNativeDriver: true }),
      Animated.spring(logo, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
    ]).start();

    const meet = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 520);
    const done = setTimeout(onDone, 2100);
    return () => {
      clearTimeout(meet);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ translateY: hop }] }}>
        <Animated.Text style={[styles.word, styles.gyan, { transform: [{ translateY: gyanY }] }]}>GYAN</Animated.Text>
        <Animated.Text style={[styles.word, styles.blitz, { transform: [{ translateY: blitzY }] }]}>BLITZ</Animated.Text>
      </Animated.View>

      <Animated.View style={{ opacity: logo, transform: [{ scale: logo }] }}>
        <Logo size={96} />
      </Animated.View>
    </View>
  );
}

const makeStyles = (C: Palette) => StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 34 },
  word: { fontWeight: "900", fontSize: 56, letterSpacing: 3, textAlign: "center", lineHeight: 58 },
  gyan: { color: C.text },
  blitz: { color: C.accent },
});
