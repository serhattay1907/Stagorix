import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { pop, sec } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";

// Word-timed captions in short groups. Groups break at punctuation in any script.
export const captionsSchema = z.object({
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
  keywords: z.array(z.string()).default([]).describe("Words shown in the accent color"),
  locale: z.string().default("en").describe("Language of the words, for case rules"),
  maxWords: z.number().int().min(1).max(6).default(3),
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
  const { words, keywords, locale, maxWords } = captionsSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const groups = groupWords(words, maxWords);
  const i = groups.findIndex((g, k) => t >= g[0].start - 0.05 && (k === groups.length - 1 || t < groups[k + 1][0].start - 0.05));
  const group = groups[i];
  if (!group || t > group[group.length - 1].end + 0.6) return null;

  const norm = (s: string) => s.toLocaleLowerCase(locale).replace(PUNCT, "");
  const keys = new Set(keywords.map(norm));
  const appear = pop(theme, frame, sec(group[0].start - 0.05, fps), fps);
  const { palette, captions } = theme;
  const fontSize = 76;

  return (
    <div
      style={{
        position: "absolute",
        top: height * (captions.position === "middle" ? 0.5 : 0.68),
        left: 64,
        right: 150, // keeps clear of the platform buttons on the right
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "4px 26px",
        opacity: appear,
        transform: `scale(${interpolate(appear, [0, 1], [0.85, 1])})`,
      }}
    >
      {group.map((w, k) => {
        const said = t >= w.start;
        const active = said && t < w.end + 0.08;
        const isKey = keys.has(norm(w.text));
        const text = captions.case === "upper" ? w.text.toLocaleUpperCase(locale) : w.text;
        const bump = pop(theme, frame, sec(w.start, fps), fps, -2);
        let color = palette.text;
        let background = "transparent";
        if (captions.style === "highlight") color = !said ? alpha(palette.text, 0.55) : isKey ? palette.accent : palette.text;
        if (captions.style === "karaoke" && active) background = palette.accent;
        if (captions.style === "plain") color = isKey ? palette.accent : palette.text;
        return (
          <span
            key={k}
            style={{
              display: "inline-block",
              fontFamily: theme.font.display,
              fontWeight: 900,
              fontSize,
              letterSpacing: -1,
              lineHeight: 1.15,
              color,
              background,
              padding: "0 12px",
              borderRadius: radiusPx(theme, fontSize),
              transform: `scale(${active && captions.style !== "plain" ? 1 + 0.06 * bump : 1})`,
              transformOrigin: "50% 80%",
              WebkitTextStroke: `2px ${alpha(palette.background, 0.55)}`,
              textShadow: `0 6px 0 ${alpha(palette.background, 0.55)}, 0 10px 30px ${alpha(palette.background, 0.6)}`,
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
};
