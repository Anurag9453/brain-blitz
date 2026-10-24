// Tiny fire-and-forget sound-effects layer over expo-audio.
// Everything is wrapped defensively: if audio fails to init or play, the game
// keeps working silently — sound is juice, never a dependency.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const SOURCES = {
  correct: require("../../assets/sounds/correct.wav"),
  wrong: require("../../assets/sounds/wrong.wav"),
  tick: require("../../assets/sounds/tick.wav"),
  go: require("../../assets/sounds/go.wav"),
  coin: require("../../assets/sounds/coin.wav"),
  win: require("../../assets/sounds/win.wav"),
  tap: require("../../assets/sounds/tap.wav"),
};
export type Sfx = keyof typeof SOURCES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let enabled = true;
let ready = false;

export async function initSfx(): Promise<void> {
  if (ready) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    (Object.keys(SOURCES) as Sfx[]).forEach((k) => {
      players[k] = createAudioPlayer(SOURCES[k]);
    });
    ready = true;
  } catch {
    // leave ready=false; play() becomes a no-op
  }
}

export function play(name: Sfx): void {
  if (!enabled || !ready) return;
  const p = players[name];
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {}
}

export function setSfxEnabled(v: boolean): void {
  enabled = v;
}
export function isSfxEnabled(): boolean {
  return enabled;
}
