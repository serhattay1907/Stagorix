import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, safeX, yFor } from "../theme/layout";
import { clamp, ease, pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { useWindow } from "./common/window";

// Chat bubbles that type themselves out, like quoting what people say. Optionally the
// bubbles are struck through and a stamp lands on top ("not anymore").
export const quoteBubblesSchema = z.object({
  bubbles: z
    .array(z.object({ text: z.string(), side: z.enum(["left", "right"]).default("left"), at: z.number().default(0) }))
    .min(1)
    .max(4)
    .describe("`at` is seconds after the effect starts"),
  label: z.string().default("").describe("Small line above, e.g. who is speaking"),
  strikeAt: z.number().optional().describe("Seconds after start: strike the bubbles through"),
  stamp: z.string().default("").describe("Stamp that lands at strikeAt"),
  at: z.number(),
  seconds: z.number().positive().default(3),
  position: positionSchema.default("upper"),
  locale: z.string().default("en").describe("Language of the text, for upper case"),
});
export type QuoteBubblesProps = z.input<typeof quoteBubblesSchema>;

export const QuoteBubbles: React.FC<QuoteBubblesProps> = (props) => {
  const p = quoteBubblesSchema.parse(props);
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const w = useWindow(p.at, p.seconds);
  if (!w.visible) return null;
  const { palette } = theme;
  const { left, right } = safeX(width);
  const top = yFor(p.position, height) - 140;
  const struck = p.strikeAt === undefined ? 0 : interpolate(w.t, [p.strikeAt, p.strikeAt + 0.35], [0, 1], { ...clamp, easing: ease });
  const stamp = p.strikeAt === undefined ? 0 : pop(theme, w.frame, Math.round((p.strikeAt + 0.1) * w.fps), w.fps, -2);
  return (
    <AbsoluteFill style={{ opacity: w.out }}>
      {p.label && (
        <div
          style={{
            position: "absolute",
            top: top - 70,
            left,
            fontFamily: theme.font.body,
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: 3,
            color: palette.muted,
            opacity: pop(theme, w.frame, 0, w.fps),
          }}
        >
          {p.label.toLocaleUpperCase(p.locale)}
        </div>
      )}
      {p.bubbles.map((b, i) => {
        const s = pop(theme, w.frame, Math.round(b.at * w.fps), w.fps);
        const typed = Math.floor(interpolate(w.t, [b.at + 0.1, b.at + 0.1 + b.text.length * 0.035], [0, b.text.length], clamp));
        const mine = b.side === "right";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: top + i * 135,
              [mine ? "right" : "left"]: mine ? right : left,
              maxWidth: width - left - right - 80,
              transform: `scale(${s})`,
              transformOrigin: mine ? "100% 100%" : "0% 100%",
            }}
          >
            <div
              style={{
                position: "relative",
                background: mine ? palette.text : alpha(palette.surface, 0.95),
                color: mine ? palette.background : palette.text,
                fontFamily: theme.font.body,
                fontWeight: 700,
                fontSize: 50,
                padding: "24px 34px",
                borderRadius: radiusPx(theme, 100),
                [mine ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 8,
                boxShadow: `0 20px 50px ${alpha(palette.background, 0.4)}`,
                filter: `saturate(${1 - struck * 0.8}) brightness(${1 - struck * 0.2})`,
              }}
            >
              {b.text.slice(0, typed)}
              <span style={{ opacity: typed < b.text.length ? 1 : 0 }}>▍</span>
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  top: "50%",
                  height: 8,
                  borderRadius: 4,
                  background: palette.negative,
                  width: `calc(${struck * 100}% - ${struck * 48}px)`,
                }}
              />
            </div>
          </div>
        );
      })}
      {p.stamp && stamp > 0 && (
        <div
          style={{
            position: "absolute",
            top: top + Math.max(0, p.bubbles.length - 1) * 67,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: Math.min(1, stamp * 1.5),
            transform: `rotate(-7deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
          }}
        >
          <div
            style={{
              border: `8px solid ${palette.negative}`,
              color: palette.negative,
              background: alpha(palette.background, 0.6),
              fontFamily: theme.font.display,
              fontWeight: 900,
              fontSize: 72,
              padding: "6px 28px",
              borderRadius: radiusPx(theme, 40),
              letterSpacing: 2,
            }}
          >
            {p.stamp.toLocaleUpperCase(p.locale)}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
