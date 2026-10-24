// Theming: two palettes (dark + light) with identical keys. Screens call
// useThemeC() to get the active palette and build styles via makeStyles(C).
import { useGame } from "./state/store";

export interface Palette {
  mode: "dark" | "light";
  ground: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  accent: string; // gold (coins / highlights)
  accent2: string; // magenta (energy)
  correct: string;
  wrong: string;
  goldText: string; // text on a gold button
  coinPill: string; // background of the coin balance pill
  coinBorder: string;
  bg: readonly [string, string, string]; // background gradient
}

export const DARK: Palette = {
  mode: "dark",
  ground: "#17112E",
  surface: "#221A40",
  surface2: "#2C2351",
  line: "#3A2F66",
  text: "#F1ECFF",
  muted: "#A99FD0",
  accent: "#FFC53D",
  accent2: "#FF4D8D",
  correct: "#3DDC97",
  wrong: "#FF5C5C",
  goldText: "#3A2700",
  coinPill: "#2a2113",
  coinBorder: "#5a4a20",
  bg: ["#2A1D55", "#17112E", "#3A1740"],
};

export const LIGHT: Palette = {
  mode: "light",
  ground: "#F4F1FB",
  surface: "#FFFFFF",
  surface2: "#F0EBFA",
  line: "#E2DAF1",
  text: "#1C1340",
  muted: "#6B6390",
  accent: "#C98A12", // deeper gold so it reads on white
  accent2: "#D63384",
  correct: "#1B9E6A",
  wrong: "#D64545",
  goldText: "#3A2700",
  coinPill: "#FFF4D6",
  coinBorder: "#E6C97A",
  bg: ["#FBFAFF", "#F4F1FB", "#EFE9FA"],
};

export const PALETTES = { dark: DARK, light: LIGHT } as const;

// ---- Unlockable colour skins (cosmetics) ----------------------------------
// Each skin is a full palette. goldText stays the same everywhere because the
// primary buttons always use the constant gold gradient below.
// PRICES/minTier MUST match the server (supabase/migrations/0017_skins.sql).
export interface SkinDef {
  id: string;
  name: string;
  price: number;
  minTier: number; // league tier required to unlock (1 = none)
  palette: Palette;
}

const SUNSET: Palette = {
  mode: "dark", ground: "#2A1410", surface: "#3A1E16", surface2: "#4A2820", line: "#5C3A2C",
  text: "#FFF1E8", muted: "#D6A892", accent: "#FF9F3D", accent2: "#FF5E7E", correct: "#58D68D",
  wrong: "#FF6B6B", goldText: "#3A2700", coinPill: "#3A2113", coinBorder: "#6A4A20",
  bg: ["#3A1E16", "#2A1410", "#4A1E2A"],
};
const OCEAN: Palette = {
  mode: "dark", ground: "#0C1E2E", surface: "#122A40", surface2: "#18374F", line: "#244A66",
  text: "#EAF6FF", muted: "#9DBBD0", accent: "#36D6E0", accent2: "#4D8DFF", correct: "#3DDC97",
  wrong: "#FF6B6B", goldText: "#3A2700", coinPill: "#103040", coinBorder: "#1F5A6A",
  bg: ["#123A52", "#0C1E2E", "#103048"],
};
const FOREST: Palette = {
  mode: "dark", ground: "#0F2417", surface: "#163021", surface2: "#1F3F2C", line: "#2C543B",
  text: "#ECFBEF", muted: "#A6C9B0", accent: "#7BD651", accent2: "#E0B341", correct: "#3DDC97",
  wrong: "#FF6B6B", goldText: "#3A2700", coinPill: "#16301F", coinBorder: "#2C5A36",
  bg: ["#163021", "#0F2417", "#143626"],
};
const NEON: Palette = {
  mode: "dark", ground: "#0A0A12", surface: "#12121F", surface2: "#1A1A2E", line: "#2A2A44",
  text: "#F0F0FF", muted: "#9090C0", accent: "#2BE8C6", accent2: "#FF2D95", correct: "#4DFF9E",
  wrong: "#FF4D6D", goldText: "#3A2700", coinPill: "#141426", coinBorder: "#2A2A55",
  bg: ["#141426", "#0A0A12", "#1A0A2E"],
};
const GALAXY: Palette = {
  mode: "dark", ground: "#140A2E", surface: "#1E1240", surface2: "#2A1A54", line: "#3D2A6E",
  text: "#F3ECFF", muted: "#B4A4E0", accent: "#C9A6FF", accent2: "#FF7AD9", correct: "#3DDC97",
  wrong: "#FF6B6B", goldText: "#3A2700", coinPill: "#241248", coinBorder: "#4A2E7E",
  bg: ["#241248", "#140A2E", "#3A1450"],
};

export const SKINS: Record<string, SkinDef> = {
  sunset: { id: "sunset", name: "Sunset", price: 3000, minTier: 1, palette: SUNSET },
  ocean: { id: "ocean", name: "Ocean", price: 3000, minTier: 1, palette: OCEAN },
  forest: { id: "forest", name: "Forest", price: 3000, minTier: 1, palette: FOREST },
  neon: { id: "neon", name: "Neon", price: 6000, minTier: 1, palette: NEON },
  galaxy: { id: "galaxy", name: "Galaxy", price: 12000, minTier: 5, palette: GALAXY },
};

/** Active palette: an equipped colour skin, else the default dark/light theme. */
export function useThemeC(): Palette {
  const skin = useGame((s) => s.skin);
  const theme = useGame((s) => s.theme);
  const def = skin && skin !== "default" ? SKINS[skin] : undefined;
  if (def) return def.palette;
  return theme === "light" ? LIGHT : DARK;
}

// The gold button gradient is the same on both themes.
export const goldGradient = ["#FFE08A", "#FFC53D", "#F0A81E"] as const;

// Static dark palette — fallback for theme-independent bits (Logo, Confetti).
export const C = DARK;
export const bgGradient = DARK.bg;
