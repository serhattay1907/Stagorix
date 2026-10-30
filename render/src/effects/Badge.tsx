import { interpolate, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, yFor } from "../theme/layout";
import { pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { useWindow } from "./common/window";

// A status badge that stamps in ("CRITICAL", "NEW", "BREAKING"), with an optional line
// under it. Tone picks the palette colour: accent, positive or negative.
export const badgeSchema = z.object({
  text: z.string(),
  sub: z.string().default(""),
  tone: z.enum(["accent", "positive", "negative"]).default("accent"),
  at: z.number(),
  seconds: z.number().positive().default(2),
  position: positionSchema.default("upper"),
  locale: z.string().default("en").describe("Language of the text, for upper case"),
});
export type BadgeProps = z.input<typeof badgeSchema>;

export const Badge: React.FC<BadgeProps> = (props) => {
  const p = badgeSchema.parse(props);
  const theme = useTheme();
  const { height } = useVideoConfig();
  const w = useWindow(p.at, p.seconds);
  if (!w.visible) return null;
  const { palette } = theme;
  const color = palette[p.tone];
  const s = pop(theme, w.frame, 0, w.fps, -4);
  const sub = pop(theme, w.frame, Math.round(0.3 * w.fps), w.fps);
  return (
    <div
      style={{
        position: "absolute",
        top: yFor(p.position, height),
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: w.out,
        transform: "translateY(-50%)",
      }}
    >
      <div
        style={{
          background: color,
          color: palette.background,
          fontFamily: theme.font.display,
          fontWeight: 900,
          fontSize: 76,
          letterSpacing: 2,
          padding: "16px 46px",
          borderRadius: radiusPx(theme, 110),
          boxShadow: `0 0 0 ${10 * (1 - s)}px ${alpha(color, 0.35)}, 0 24px 60px ${alpha(palette.background, 0.5)}`,
          transform: `scale(${interpolate(s, [0, 1], [2.2, 1])}) rotate(${interpolate(s, [0, 1], [-8, -2])}deg)`,
          opacity: Math.min(1, s * 1.5),
        }}
      >
        {p.text.toLocaleUpperCase(p.locale)}
      </div>
      {p.sub && (
        <div
          style={{
            marginTop: 26,
            fontFamily: theme.font.body,
            fontWeight: 700,
            fontSize: 42,
            color: palette.text,
            background: alpha(palette.surface, 0.85),
            padding: "10px 26px",
            borderRadius: radiusPx(theme, 62),
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.sub}
        </div>
      )}
    </div>
  );
};
