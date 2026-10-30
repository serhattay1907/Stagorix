import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, yFor } from "../theme/layout";
import { formatNumber } from "../theme/format";
import { clamp, ease, pop, sec } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";

// A key number that counts up and lands big when it is said ("73%", "3x", "$1.2M").
// Formatting follows the locale, so separators match the brand's language.
export const numberPopSchema = z.object({
  value: z.number(),
  decimals: z.number().int().min(0).max(3).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  caption: z.string().default("").describe("Short line under the number"),
  at: z.number(),
  seconds: z.number().positive().default(2.2),
  locale: z.string().default("en"),
  position: positionSchema.default("upper"),
});
export type NumberPopProps = z.input<typeof numberPopSchema>;

export const NumberPop: React.FC<NumberPopProps> = (props) => {
  const { value, decimals, prefix, suffix, caption, at, seconds, locale, position } = numberPopSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const start = sec(at, fps);
  const end = sec(at + seconds, fps);
  if (frame < start || frame > end) return null;
  const count = interpolate(frame, [start, start + sec(0.7, fps)], [0, 1], { ...clamp, easing: ease });
  const land = pop(theme, frame, start + sec(0.7, fps), fps, -3);
  const appear = pop(theme, frame, start, fps);
  const out = interpolate(frame, [end - 6, end], [1, 0], clamp);
  const shown = formatNumber(value * count, locale, decimals);
  const { palette } = theme;
  return (
    <div
      style={{
        position: "absolute",
        top: yFor(position, height),
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: appear * out,
        transform: `translateY(-50%) scale(${interpolate(appear, [0, 1], [0.7, 1]) * (1 + 0.08 * Math.sin(land * Math.PI))})`,
      }}
    >
      <div
        style={{
          fontFamily: theme.font.display,
          fontWeight: 900,
          fontSize: 210,
          lineHeight: 1,
          letterSpacing: -6,
          color: palette.accent,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 10px 0 ${alpha(palette.background, 0.55)}, 0 24px 60px ${alpha(palette.background, 0.6)}`,
        }}
      >
        {prefix}
        {shown}
        {suffix}
      </div>
      {caption && (
        <div
          style={{
            marginTop: 14,
            fontFamily: theme.font.body,
            fontWeight: 800,
            fontSize: 44,
            color: palette.text,
            background: alpha(palette.surface, 0.75),
            padding: "10px 24px",
            borderRadius: radiusPx(theme, 64),
            opacity: land,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};
