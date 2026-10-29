import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, safeX, yFor } from "../theme/layout";
import { pop, sec } from "../theme/motion";
import { alpha, captionStyleSchema, radiusPx, useTheme } from "../theme/theme";

// Word-timed captions in short groups that break at punctuation in any script.
// Style and position come from the theme; a video may override them.
export const captionsSchema = z.object({
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
  keywords: z.array(z.string()).default([]).describe("Words shown in the accent color"),
  locale: z.string().default("en").describe("Language of the words, for case rules"),
  maxWords: z.number().int().min(1).max(6).default(3),
  style: captionStyleSchema.optional(),
  position: positionSchema.optional(),
});
export type CaptionsProps = z.input<typeof captionsSchema>;
type CaptionWord = CaptionsProps["words"][number];

const BREAK = /[.,!?;:…。！？，、؟]$/u;
const PUNCT = /[\p{P}]/gu;

export const groupWords = (words: CaptionWord[], maxWords: number): CaptionWord[][] => {
  const out: CaptionWord[][] = [];
  let clause: CaptionWord[] = [];
  const flush = () => {
    if (!clause.length) return;
    const size = Math.ceil(clause.length / Math.ceil(clause.length / maxWords));
    for (let i = 0; i < clause.length; i += size) out.push(clause.slice(i, i + size));
    clause = [];
  };
  for (const w of words) {
    clause.push(w);
    if (BREAK.test(w.text)) flush();
  }
  flush();
  return out;
};

export const Captions: React.FC<CaptionsProps> = (props) => {
  const parsed = captionsSchema.parse(props);
  const { words, keywords, locale } = parsed;
  const theme = useTheme();
  const style = parsed.style ?? theme.captions.style;
  const position = parsed.position ?? theme.captions.position;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const groups = groupWords(words, style === "pop" ? 1 : parsed.maxWords);
  const i = groups.findIndex(
    (g, k) => t >= g[0].start - 0.05 && (k === groups.length - 1 || t < groups[k + 1][0].start - 0.05),
  );
  const group = groups[i];
  if (!group || t > group[group.length - 1].end + 0.5) return null;

  const norm = (s: string) => s.toLocaleLowerCase(locale).replace(PUNCT, "");
  const keys = new Set(keywords.map(norm));
  const appear = pop(theme, frame, sec(group[0].start - 0.05, fps), fps);
  const { palette, captions } = theme;
  const fontSize = style === "pop" ? 128 : 74;
  const { left, right } = safeX(width);
  const outline = `0 4px 0 ${alpha(palette.background, 0.6)}, 0 10px 28px ${alpha(palette.background, 0.65)}`;
  const boxed = style === "boxed";

  return (
    <div
      style={{
        position: "absolute",
        top: yFor(position, height),
        left,
        right,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(-50%) scale(${interpolate(appear, [0, 1], [style === "pop" ? 0.6 : 0.85, 1])})`,
        opacity: appear,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: boxed ? "6px 18px" : "4px 24px",
          padding: boxed ? "18px 30px" : 0,
          background: boxed ? alpha(palette.surface, 0.88) : "transparent",
          borderRadius: boxed ? radiusPx(theme, fontSize * 1.6) : 0,
          boxShadow: boxed ? `0 18px 40px ${alpha(palette.background, 0.45)}` : "none",
        }}
      >
        {group.map((w, k) => {
          const said = t >= w.start;
          const active = said && t < w.end + 0.08;
          const isKey = keys.has(norm(w.text));
          const text = captions.case === "upper" || style === "pop" ? w.text.toLocaleUpperCase(locale) : w.text;
          const bump = pop(theme, frame, sec(w.start, fps), fps, -2);
          let color = palette.text;
          let background = "transparent";
          if (style === "highlight" || boxed) color = !said ? alpha(palette.text, 0.5) : isKey ? palette.accent : palette.text;
          if (style === "karaoke" && active) {
            background = palette.accent;
            color = palette.background;
          }
          if (style === "pop" || style === "plain") color = isKey ? palette.accent : palette.text;
          return (
            <span
              key={k}
              style={{
                display: "inline-block",
                fontFamily: theme.font.display,
                fontWeight: 900,
                fontSize,
                letterSpacing: style === "pop" ? -2 : -0.5,
                lineHeight: 1.12,
                color,
                background,
                padding: style === "karaoke" ? "0 14px" : 0,
                borderRadius: radiusPx(theme, fontSize * 1.1),
                transform: `scale(${active && style !== "plain" ? 1 + 0.07 * bump : 1})`,
                transformOrigin: "50% 80%",
                textShadow: boxed || background !== "transparent" ? "none" : outline,
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
