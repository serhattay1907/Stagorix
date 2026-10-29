import { Easing, spring } from "remotion";
import type { Theme } from "./theme";

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const DAMPING = [22, 18, 14, 12, 10];
const MASS = [1, 0.85, 0.7, 0.6, 0.5];
const AMOUNT = [0.4, 0.7, 1, 1.3, 1.6];

/** Spring from 0 to 1 starting at frame `at`; bounce follows the theme's energy. */
export const pop = (theme: Theme, frame: number, at: number, fps: number, extra = 0) =>
  spring({ frame: frame - at, fps, config: { damping: DAMPING[theme.energy - 1] + extra, mass: MASS[theme.energy - 1] } });

/** Scale a motion amount (zoom, travel, overshoot) by the theme's energy. */
export const amount = (theme: Theme, base: number) => base * AMOUNT[theme.energy - 1];

export const sec = (seconds: number, fps: number) => Math.round(seconds * fps);
