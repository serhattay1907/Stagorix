import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, ease } from "../theme/motion";
import { z } from "zod";
import { SAFE } from "../theme/layout";
import { pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { ContentView, contentSchema, focusSchema, SpeakerView } from "./common/views";

// A content card drops in over the top of the frame, slightly tilted; the speaker shot slides
// down so the face stays visible under the card, over a blurred copy of the same shot.
export const cardOverFaceSchema = z.object({
  focus: focusSchema,
  content: contentSchema,
  label: z.string().default("").describe("Small caption under the card, e.g. the source"),
  faceAt: z.number().min(0.5).max(0.75).default(0.66).describe("Where the face sits, as a share of the height"),
});
export type CardOverFaceProps = z.input<typeof cardOverFaceSchema> & { speaker: React.ReactNode };

export const CardOverFace: React.FC<CardOverFaceProps> = ({ speaker, ...props }) => {
  const p = cardOverFaceSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = pop(theme, frame, 2, fps);
  const slide = interpolate(frame, [0, 0.45 * fps], [0, 1], { ...clamp, easing: ease });
  const shift = Math.max(0, height * p.faceAt - p.focus.y) * slide;
  const left = width * SAFE.left;
  const cardW = width * (1 - SAFE.left - SAFE.right);
  const cardH = Math.min(cardW * 0.62, height * 0.26);
  const fade = `linear-gradient(180deg, transparent 0px, black ${Math.min(shift, 160)}px)`;
  return (
    <AbsoluteFill style={{ background: theme.palette.background }}>
      <AbsoluteFill style={{ filter: "blur(28px) brightness(0.55)", transform: "scale(1.1)" }}>
        <SpeakerView width={width} height={height} focus={p.focus}>
          {speaker}
        </SpeakerView>
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${shift}px)`, maskImage: fade, WebkitMaskImage: fade }}>
        <SpeakerView width={width} height={height} focus={p.focus}>
          {speaker}
        </SpeakerView>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left,
          top: height * 0.09,
          width: cardW,
          transform: `translateY(${interpolate(s, [0, 1], [-500, 0])}px) rotate(${interpolate(s, [0, 1], [-8, -2])}deg)`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: cardW,
            height: cardH,
            borderRadius: radiusPx(theme, 200),
            overflow: "hidden",
            border: `6px solid ${theme.palette.text}`,
            boxShadow: `0 40px 80px ${alpha(theme.palette.background, 0.6)}`,
          }}
        >
          <ContentView content={p.content} />
        </div>
        {p.label && (
          <div style={{ marginTop: 16, fontFamily: theme.font.body, fontWeight: 700, fontSize: 30, color: alpha(theme.palette.text, 0.85), textShadow: `0 2px 10px ${alpha(theme.palette.background, 0.8)}` }}>
            {p.label}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
