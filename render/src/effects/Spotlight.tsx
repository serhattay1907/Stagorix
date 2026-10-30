import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp, ease, pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { useWindow } from "./common/window";

// Darkens everything except a circle, to point at one thing (a face, a detail, a number).
// The circle closes in from the full frame; an optional label sits under it.
export const spotlightSchema = z.object({
  x: z.number().describe("Centre in px"),
  y: z.number(),
  radius: z.number().positive().default(260),
  label: z.string().default(""),
  dim: z.number().min(0).max(1).default(0.75),
  at: z.number(),
  seconds: z.number().positive().default(2.5),
});
export type SpotlightProps = z.input<typeof spotlightSchema>;

export const Spotlight: React.FC<SpotlightProps> = (props) => {
  const p = spotlightSchema.parse(props);
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const w = useWindow(p.at, p.seconds);
  if (!w.visible) return null;
  const { palette } = theme;
  const close = interpolate(w.t, [0, 0.5], [0, 1], { ...clamp, easing: ease });
  const r = interpolate(close, [0, 1], [Math.hypot(width, height), p.radius]);
  const ring = pop(theme, w.frame, Math.round(0.45 * w.fps), w.fps);
  const label = pop(theme, w.frame, Math.round(0.6 * w.fps), w.fps);
  const shade = alpha(palette.background, p.dim * close);
  return (
    <AbsoluteFill style={{ opacity: w.out }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle ${r}px at ${p.x}px ${p.y}px, transparent 96%, ${shade} 100%)` }} />
      <div
        style={{
          position: "absolute",
          left: p.x - p.radius,
          top: p.y - p.radius,
          width: p.radius * 2,
          height: p.radius * 2,
          borderRadius: "50%",
          border: `6px solid ${palette.accent}`,
          opacity: ring,
          transform: `scale(${interpolate(ring, [0, 1], [1.15, 1])})`,
          boxShadow: `0 0 40px ${alpha(palette.accent, 0.5)}`,
        }}
      />
      {p.label && (
        <div style={{ position: "absolute", left: 0, right: 0, top: p.y + p.radius + 30, display: "flex", justifyContent: "center", opacity: label }}>
          <div
            style={{
              fontFamily: theme.font.body,
              fontWeight: 800,
              fontSize: 48,
              color: palette.background,
              background: palette.accent,
              padding: "10px 28px",
              borderRadius: radiusPx(theme, 70),
              transform: `translateY(${interpolate(label, [0, 1], [20, 0])}px)`,
            }}
          >
            {p.label}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
