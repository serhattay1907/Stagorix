import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { amount, clamp, ease } from "../theme/motion";
import { useTheme } from "../theme/theme";

// Section transitions on continuous footage. Glitch and zoom blur act on the wrapped
// layers; the iris is a theme-coloured circle that closes and reopens over them.
export const transitionKind = z.enum(["glitch", "iris", "zoomblur"]);
export const transitionsSchema = z.object({
  items: z.array(z.object({ kind: transitionKind, at: z.number().describe("Seconds of the cut") })).default([]),
  origin: z.object({ x: z.number(), y: z.number() }).default({ x: 540, y: 960 }),
});
export type TransitionsProps = z.input<typeof transitionsSchema>;

const LEN = { glitch: 0.4, iris: 0.6, zoomblur: 0.5 } as const;

const progress = (t: number, at: number, kind: keyof typeof LEN) => {
  const half = LEN[kind] / 2;
  return interpolate(t, [at - half, at + half], [0, 1], clamp);
};

/** 0 → 1 → 0 around the cut, so effects peak exactly on it. */
const peak = (p: number) => (p <= 0 || p >= 1 ? 0 : 1 - Math.abs(p * 2 - 1));

// Channel split + horizontal slice displacement, seeded by frame so every render matches.
const GlitchFilter: React.FC<{ id: string; strength: number; seed: number }> = ({ id, strength, seed }) => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <filter id={id} x="-5%" y="0" width="110%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0001 0.06" numOctaves="1" seed={seed} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={60 * strength} xChannelSelector="R" yChannelSelector="A" result="sliced" />
      <feColorMatrix in="sliced" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={18 * strength} result="rs" />
      <feColorMatrix in="sliced" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="sliced" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={-18 * strength} result="bs" />
      <feBlend in="rs" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="bs" mode="screen" />
    </filter>
  </svg>
);

export const Transitions: React.FC<TransitionsProps & { children?: React.ReactNode }> = ({ children, ...props }) => {
  const { items, origin } = transitionsSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  let glitch = 0;
  let zoom = 0;
  let iris = -1;
  for (const it of items) {
    const p = progress(t, it.at, it.kind);
    if (it.kind === "glitch") glitch = Math.max(glitch, peak(p));
    if (it.kind === "zoomblur") {
      // Snaps in just before the cut, settles after it.
      const k = interpolate(t, [it.at - 0.1, it.at + LEN.zoomblur - 0.1], [0, 1], clamp);
      if (k > 0 && k < 1) zoom = Math.max(zoom, k < 0.2 ? k / 0.2 : (1 - k) / 0.8);
    }
    if (it.kind === "iris" && p > 0 && p < 1) iris = p;
  }

  const id = `glitch-${frame}`;
  const zoomScale = 1 + zoom * amount(theme, 0.25);
  const style: React.CSSProperties = {
    transform: zoom > 0 ? `scale(${zoomScale})` : undefined,
    transformOrigin: `${origin.x}px ${origin.y}px`,
    filter: [glitch > 0.01 ? `url(#${id})` : "", zoom > 0.01 ? `blur(${zoom * 16}px)` : ""].join(" ").trim() || undefined,
  };

  // Iris: the circle closes to a point on the cut, then opens again.
  const radius = Math.hypot(width, height);
  const r = iris < 0 ? radius : iris < 0.5 ? radius * interpolate(iris, [0, 0.5], [1, 0], { easing: ease }) : radius * interpolate(iris, [0.5, 1], [0, 1], { easing: ease });
  return (
    <AbsoluteFill>
      {glitch > 0.01 && <GlitchFilter id={id} strength={amount(theme, glitch)} seed={frame % 97} />}
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
      {iris >= 0 && (
        <AbsoluteFill
          style={{
            background: theme.palette.accent,
            WebkitMaskImage: `radial-gradient(circle ${r}px at ${origin.x}px ${origin.y}px, transparent 98%, black 100%)`,
            maskImage: `radial-gradient(circle ${r}px at ${origin.x}px ${origin.y}px, transparent 98%, black 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
