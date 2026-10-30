import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { SAFE } from "../theme/layout";
import { pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { ContentView, contentSchema, focusSchema, KenBurns, SpeakerView } from "./common/views";

// Content fills the frame; the speaker sits in a framed box in a corner, kept clear of
// the platform buttons (right edge) and the description (bottom).
export const pictureInPictureSchema = z.object({
  focus: focusSchema,
  content: contentSchema,
  corner: z.enum(["top-left", "top-right", "bottom-left"]).default("top-left"),
  shape: z.enum(["box", "circle"]).default("box"),
  size: z.number().min(0.25).max(0.5).default(0.36).describe("Width as a share of the frame"),
  kenBurns: z.boolean().default(false).describe("Slow push-in on the content (B-roll)"),
});
export type PictureInPictureProps = z.input<typeof pictureInPictureSchema> & { speaker: React.ReactNode };

export const PictureInPicture: React.FC<PictureInPictureProps> = ({ speaker, ...props }) => {
  const p = pictureInPictureSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = pop(theme, frame, 4, fps);
  const w = Math.round(width * p.size);
  const h = p.shape === "circle" ? w : Math.round(w * 1.3);
  const left = p.corner === "top-right" ? width * (1 - SAFE.right) - w : width * SAFE.left;
  const top = p.corner === "bottom-left" ? height * (1 - SAFE.bottom) - h - 40 : height * SAFE.top + 40;
  const radius = p.shape === "circle" ? w / 2 : radiusPx(theme, 200);
  return (
    <AbsoluteFill>
      {p.kenBurns ? (
        <KenBurns>
          <ContentView content={p.content} />
        </KenBurns>
      ) : (
        <ContentView content={p.content} />
      )}
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: w,
          height: h,
          borderRadius: radius,
          overflow: "hidden",
          border: `6px solid ${theme.palette.accent}`,
          boxShadow: `0 30px 60px ${alpha(theme.palette.background, 0.55)}`,
          transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`,
          opacity: s,
          transformOrigin: p.corner === "top-right" ? "100% 0%" : p.corner === "bottom-left" ? "0% 100%" : "0% 0%",
        }}
      >
        <SpeakerView width={w} height={h} focus={p.focus} zoom={1.6} anchor={{ x: 0.5, y: 0.42 }}>
          {speaker}
        </SpeakerView>
      </div>
    </AbsoluteFill>
  );
};
