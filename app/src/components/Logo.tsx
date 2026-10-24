import React, { useId } from "react";
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Line } from "react-native-svg";

// Brain Blitz mark — "Spark Book": an open book with a spark rising from it.
// Drawn as a vector so it stays crisp at any size (splash, onboarding, icon).
export default function Logo({ size = 96 }: { size?: number }) {
  const raw = useId().replace(/:/g, ""); // unique gradient ids per instance
  const tile = `tile${raw}`;
  const book = `book${raw}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2C2351" />
          <Stop offset="1" stopColor="#17112E" />
        </LinearGradient>
        <LinearGradient id={book} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="1" stopColor="#F0A81E" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="192" height="192" rx="44" fill={`url(#${tile})`} stroke="#3A2F66" strokeWidth={2} />
      {/* open book */}
      <Path d="M40 132 L98 120 V154 L40 166 Z" fill={`url(#${book})`} />
      <Path d="M160 132 L102 120 V154 L160 166 Z" fill="#FFC53D" />
      <Line x1="100" y1="120" x2="100" y2="154" stroke="#7A5410" strokeWidth={3} />
      {/* spark rising from the book */}
      <Path d="M110 40 L78 92 H98 L90 118 L128 78 H106 Z" fill="#FF4D8D" />
    </Svg>
  );
}
