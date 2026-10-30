import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { amount, clamp, ease } from "../theme/motion";
import { useTheme } from "../theme/theme";

// Virtual camera moves on top of the footage: eased zoom keyframes (punch-ins)
// whip transitions (fast zoom + blur + flash) and short emphasis shakes. Wrap layers that
// must move together.
export const cameraSchema = z.object({
  zooms: z
    .array(z.object({ at: z.number(), scale: z.number().min(1).max(2), ease: z.number().min(0).default(0.2) }))
    .default([]),
  whips: z.array(z.number()).default([]).describe("Seconds where a whip transition peaks"),
  shakes: z.array(z.number()).default([]).describe("Seconds where an emphasis shake starts"),
  origin: z.object({ x: z.number(), y: z.number() }).describe("Zoom centre in px, usually the face"),
});
export type CameraProps = z.input<typeof cameraSchema>;

const WHIP = 0.35;
const SHAKE = 0.45;

/** Decaying, deterministic jitter: same frame, same offset on every machine. */
export const shakeOffset = (t: number, shakes: number[], strength: number) => {
  let x = 0;
  let y = 0;
  for (const at of shakes) {
    const k = (t - at) / SHAKE;
    if (k < 0 || k > 1) continue;
    const decay = (1 - k) ** 2;
    x += Math.sin(k * 61) * strength * decay;
    y += Math.cos(k * 47) * strength * 0.7 * decay;
  }
  return { x, y };
};

export const useWhip = (whips: number[]) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return Math.max(0, ...whips.map((w) => interpolate(t, [w - WHIP / 2, w, w + WHIP / 2], [0, 1, 0], clamp)));
};

export const Camera: React.FC<CameraProps & { children?: React.ReactNode }> = ({ children, ...props }) => {
  const { zooms, whips, shakes, origin } = cameraSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let scale = 1;
  const keys = [...zooms].sort((a, b) => a.at - b.at);
  let cur = -1;
  keys.forEach((k, i) => {
    if (t >= k.at) cur = i;
  });
  if (cur >= 0) {
    const from = cur > 0 ? keys[cur - 1].scale : 1;
    const k = keys[cur];
    const p = interpolate(t, [k.at, k.at + k.ease], [0, 1], { ...clamp, easing: ease });
    scale = from + (k.scale - from) * p;
  }
  scale = 1 + (scale - 1) * amount(theme, 1);
  const w = useWhip(whips);
  const shake = shakeOffset(t, shakes, amount(theme, 18));
  scale += w * amount(theme, 0.3);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${shake.x}px, ${shake.y}px) scale(${scale})`,
        transformOrigin: `${origin.x}px ${origin.y}px`,
        filter: w > 0.01 ? `blur(${w * 14}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** White flash at each whip's peak; place above everything else. */
export const WhipFlash: React.FC<{ whips: number[] }> = ({ whips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = Math.max(0, ...whips.map((w) => interpolate(t, [w - 0.05, w + 0.02, w + 0.12], [0, 0.7, 0], clamp)));
  return <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />;
};
