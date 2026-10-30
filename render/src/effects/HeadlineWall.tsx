import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { z } from "zod";
import { safeX } from "../theme/layout";
import { clamp, pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { useWindow } from "./common/window";

// News hook: headline cards drop in at slight angles, then one big line lands on top
// while the wall blurs behind it ("14 YEARS").
export const headlineWallSchema = z.object({
  headlines: z.array(z.object({ text: z.string(), accent: z.boolean().default(false) })).min(2).max(5),
  punch: z.string().describe("Big line that lands on top"),
  caption: z.string().default(""),
  punchAt: z.number().default(1.2).describe("Seconds after start"),
  at: z.number(),
  seconds: z.number().positive().default(3),
});
export type HeadlineWallProps = z.input<typeof headlineWallSchema>;

const TILT = [-5, 4, -3, 5, -4];

export const HeadlineWall: React.FC<HeadlineWallProps> = (props) => {
  const p = headlineWallSchema.parse(props);
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const w = useWindow(p.at, p.seconds);
  if (!w.visible) return null;
  const { palette } = theme;
  const { left } = safeX(width);
  const big = pop(theme, w.frame, Math.round(p.punchAt * w.fps), w.fps, -3);
  const top0 = height * 0.16;
  return (
    <AbsoluteFill style={{ opacity: w.out }}>
      <AbsoluteFill style={{ background: alpha(palette.background, 0.55 * Math.min(1, w.t * 4)) }} />
      {p.headlines.map((h, i) => {
        const s = pop(theme, w.frame, Math.round(i * 0.22 * w.fps), w.fps);
        const y = top0 + i * 150;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + (i % 2) * 50,
              top: interpolate(s, [0, 1], [y - 400, y]),
              transform: `rotate(${TILT[i] * s}deg)`,
              opacity: interpolate(s, [0, 0.3], [0, 1], clamp) * interpolate(big, [0, 1], [1, 0.25]),
              filter: big > 0.01 ? `blur(${6 * big}px)` : undefined,
              background: palette.surface,
              borderLeft: `12px solid ${h.accent ? palette.accent : palette.muted}`,
              borderRadius: radiusPx(theme, 60),
              padding: "26px 38px",
              fontFamily: theme.font.display,
              fontWeight: 800,
              fontSize: 54,
              color: palette.text,
              boxShadow: `0 30px 60px ${alpha(palette.background, 0.5)}`,
            }}
          >
            {h.text}
          </div>
        );
      })}
      {big > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * 0.24,
            textAlign: "center",
            opacity: Math.min(1, big * 1.5),
            transform: `scale(${interpolate(big, [0, 1], [1.6, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: theme.font.display,
              fontWeight: 900,
              fontSize: 230,
              lineHeight: 0.95,
              letterSpacing: -8,
              color: palette.accent,
              textShadow: `0 20px 60px ${alpha(palette.background, 0.7)}`,
            }}
          >
            {p.punch}
          </div>
          {p.caption && (
            <div style={{ marginTop: 18, fontFamily: theme.font.body, fontWeight: 700, fontSize: 52, color: palette.text }}>{p.caption}</div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
