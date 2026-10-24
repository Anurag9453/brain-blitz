import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import { C } from "../theme";

const COLORS = [C.accent, C.accent2, C.correct, "#7AA8FF", "#FFE08A"];
const N = 28;

/** A one-shot confetti burst from the top. Self-contained (no native deps). */
export default function Confetti({ run }: { run: boolean }) {
  const W = Dimensions.get("window").width;
  const pieces = useRef(
    Array.from({ length: N }, (_, i) => ({
      x: Math.random() * W,
      delay: Math.random() * 250,
      dur: 1400 + Math.random() * 900,
      drift: (Math.random() - 0.5) * 120,
      color: COLORS[i % COLORS.length],
      size: 7 + Math.random() * 7,
      rotate: Math.random() * 360,
      progress: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!run) return;
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.progress, {
          toValue: 1,
          duration: p.dur,
          delay: p.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [run, pieces]);

  if (!run) return null;
  const H = Dimensions.get("window").height;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            borderRadius: 2,
            opacity: p.progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.9] }) },
              { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              {
                rotate: p.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${p.rotate}deg`, `${p.rotate + 360}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
