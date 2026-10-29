import { z } from "zod";

// Named vertical positions instead of pixel values, so a brand or the editor picks
// "upper" or "lower" and the effect lands inside the platform safe area.
export const positionSchema = z.enum(["top", "upper", "middle", "lower"]);
export type Position = z.infer<typeof positionSchema>;

const Y: Record<Position, number> = { top: 0.12, upper: 0.25, middle: 0.5, lower: 0.64 };

/** Share of the frame kept clear of platform UI (Shorts and Reels overlay buttons and text). */
export const SAFE = { left: 0.06, right: 0.13, top: 0.08, bottom: 0.2 } as const;

export const yFor = (position: Position, height: number) => Y[position] * height;

export const safeX = (width: number) => ({ left: SAFE.left * width, right: SAFE.right * width });
