import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { SAFE } from "../theme/layout";
import { pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { ContentView, contentSchema, focusSchema, SpeakerView } from "./common/views";

// A screen recording in a large window on a brand backdrop, with the speaker in a round
// bubble on its upper right corner, clear of the captions below (tutorials, app demos).
export const screenFaceSchema = z.object({
  focus: focusSchema,
  content: contentSchema.default({ src: "", kind: "screen" }),
  bubble: z.number().min(0.25).max(0.45).default(0.34).describe("Bubble width as a share of the frame"),
});
export type ScreenFaceProps = z.input<typeof screenFaceSchema> & { speaker: React.ReactNode };

export const ScreenFace: React.FC<ScreenFaceProps> = ({ speaker, ...props }) => {
  const p = screenFaceSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const win = pop(theme, frame, 0, fps);
  const bub = pop(theme, frame, 6, fps);
  const left = width * SAFE.left;
  const w = width * (1 - SAFE.left - SAFE.right);
  const top = height * SAFE.top + 20;
  const h = height * 0.56;
  const d = Math.round(width * p.bubble);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${palette.surface}, ${palette.background})` }}>
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: w,
          height: h,
          borderRadius: radiusPx(theme, 100),
          overflow: "hidden",
          boxShadow: `0 30px 80px ${alpha(palette.background, 0.6)}`,
          opacity: win,
          transform: `scale(${interpolate(win, [0, 1], [0.94, 1])})`,
        }}
      >
        <ContentView content={p.content} />
      </div>
      <div
        style={{
          position: "absolute",
          left: left + w - d + 20,
          top: top - 10,
          width: d,
          height: d,
          borderRadius: "50%",
          overflow: "hidden",
          border: `6px solid ${palette.accent}`,
          boxShadow: `0 20px 50px ${alpha(palette.background, 0.6)}`,
          transform: `scale(${bub})`,
          transformOrigin: "100% 0%",
        }}
      >
        <SpeakerView width={d} height={d} focus={p.focus} zoom={1.8} anchor={{ x: 0.5, y: 0.5 }}>
          {speaker}
        </SpeakerView>
      </div>
    </AbsoluteFill>
  );
};
