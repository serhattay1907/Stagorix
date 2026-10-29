import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp, pop, sec } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";

// Big hook title that sits behind the speaker: render <TitleBehind>, then
// <CutoutLayer> on top so the person covers part of the letters.
export const titleBehindSchema = z.object({
  lines: z.array(z.object({ text: z.string(), accent: z.boolean().default(false), at: z.number() })).min(1),
  until: z.number().describe("Seconds; the title fades out here"),
  top: z.number().default(225),
  fontSize: z.number().default(118),
});
export type TitleBehindProps = z.input<typeof titleBehindSchema>;

export const TitleBehind: React.FC<TitleBehindProps> = (props) => {
  const { lines, until, top, fontSize } = titleBehindSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [sec(until, fps) - 6, sec(until, fps)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {lines.map((line, li) => (
        <div
          key={li}
          style={{ position: "absolute", top: top + li * fontSize * 1.08, left: 0, right: 0, display: "flex", justifyContent: "center" }}
        >
          {Array.from(line.text).map((ch, i) => {
            const s = pop(theme, frame, sec(line.at, fps) + i * 1.2, fps, -3);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  fontFamily: theme.font.display,
                  fontWeight: 900,
                  fontSize,
                  letterSpacing: -3,
                  color: line.accent ? theme.palette.accent : theme.palette.text,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [90, 0])}px) scale(${interpolate(s, [0, 1], [1.4, 1])})`,
                  textShadow: `0 18px 50px ${alpha(theme.palette.background, 0.45)}`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

// Person cutout frames written by `stagorix analyze` (cutout/0000.png …).
export const cutoutLayerSchema = z.object({
  dir: z.string().default("cutout"),
  frames: z.number().int().min(0),
});
export type CutoutLayerProps = z.input<typeof cutoutLayerSchema>;

export const CutoutLayer: React.FC<CutoutLayerProps> = (props) => {
  const { dir, frames } = cutoutLayerSchema.parse(props);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame >= frames) return null;
  return <Img src={staticFile(`${dir}/${String(frame).padStart(4, "0")}.png`)} style={{ position: "absolute", width, height }} />;
};
