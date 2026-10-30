import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { SAFE } from "../theme/layout";
import { pop } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";

// No picture, only the words: lines land one after another on the brand backdrop, the key
// word in the accent colour. For statements, quotes and audio-only parts.
export const textOnlySchema = z.object({
  lines: z.array(z.string()).min(1).max(5),
  highlight: z.string().default("").describe("Word shown in the accent colour"),
  step: z.number().positive().default(0.45).describe("Seconds between lines"),
  locale: z.string().default("en"),
});
export type TextOnlyProps = z.input<typeof textOnlySchema>;

export const TextOnly: React.FC<TextOnlyProps> = (props) => {
  const p = textOnlySchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const key = p.highlight.toLocaleLowerCase(p.locale);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 50% at 30% 30%, ${alpha(palette.accent, 0.18)}, transparent 70%), ${palette.background}`,
        justifyContent: "center",
        paddingLeft: width * SAFE.left + 20,
        paddingRight: width * SAFE.right + 20,
      }}
    >
      {p.lines.map((line, i) => {
        const s = pop(theme, frame, Math.round((0.2 + i * p.step) * fps), fps);
        return (
          <div
            key={i}
            style={{
              fontFamily: theme.font.display,
              fontWeight: 900,
              fontSize: 104,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: palette.text,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
            }}
          >
            {line.split(" ").map((w, j) => (
              <span key={j} style={{ color: key && w.toLocaleLowerCase(p.locale).replace(/[\p{P}]/gu, "") === key ? palette.accent : undefined }}>
                {w}{" "}
              </span>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
