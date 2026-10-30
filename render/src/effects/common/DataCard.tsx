import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, safeX, yFor } from "../../theme/layout";
import { clamp, pop, sec } from "../../theme/motion";
import { alpha, radiusPx, useTheme } from "../../theme/theme";

// Shared frame for data cards: timing, entry/exit, a frosted panel inside the safe area
// and an optional title. Each card draws its own content and gets the local time.
export const dataCardSchema = z.object({
  at: z.number().describe("Seconds"),
  seconds: z.number().positive().default(3),
  title: z.string().default(""),
  position: positionSchema.default("upper"),
  locale: z.string().default("en").describe("Language for number formatting"),
});
export type DataCardProps = z.input<typeof dataCardSchema>;

export const DataCard: React.FC<{
  at: number;
  seconds: number;
  title: string;
  position: z.infer<typeof positionSchema>;
  children: (t: number) => React.ReactNode;
}> = ({ at, seconds, title, position, children }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const start = sec(at, fps);
  const end = sec(at + seconds, fps);
  if (frame < start || frame > end) return null;
  const appear = pop(theme, frame, start, fps);
  const out = interpolate(frame, [end - 8, end], [1, 0], clamp);
  const { left, right } = safeX(width);
  const { palette } = theme;
  return (
    <div
      style={{
        position: "absolute",
        top: yFor(position, height),
        left,
        right,
        opacity: appear * out,
        transform: `translateY(calc(-50% + ${interpolate(appear, [0, 1], [80, 0])}px)) scale(${interpolate(appear, [0, 1], [0.92, 1])})`,
      }}
    >
      <div
        style={{
          background: alpha(palette.surface, 0.9),
          borderRadius: radiusPx(theme, 160),
          padding: "40px 44px",
          boxShadow: `0 30px 80px ${alpha(palette.background, 0.55)}`,
          border: `2px solid ${alpha(palette.text, 0.08)}`,
          fontFamily: theme.font.body,
          color: palette.text,
        }}
      >
        {title && (
          <div style={{ fontFamily: theme.font.display, fontWeight: 900, fontSize: 52, lineHeight: 1.1, marginBottom: 30 }}>{title}</div>
        )}
        {children((frame - start) / fps)}
      </div>
    </div>
  );
};
