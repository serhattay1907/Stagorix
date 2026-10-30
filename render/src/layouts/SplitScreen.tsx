import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp, ease } from "../theme/motion";
import { useTheme } from "../theme/theme";
import { ContentView, contentSchema, focusSchema, SpeakerView } from "./common/views";

// Content in one half, the speaker in the other, split by a thin accent line that draws in.
export const splitScreenSchema = z.object({
  focus: focusSchema,
  content: contentSchema,
  speakerTop: z.boolean().default(false).describe("Put the speaker in the top half"),
  ratio: z.number().min(0.35).max(0.65).default(0.45).describe("Share of the height for the top part; the seam stays clear of centred captions"),
});
export type SplitScreenProps = z.input<typeof splitScreenSchema> & { speaker: React.ReactNode };

export const SplitScreen: React.FC<SplitScreenProps> = ({ speaker, ...props }) => {
  const p = splitScreenSchema.parse(props);
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const line = interpolate(frame, [0, 0.4 * fps], [0, 1], { ...clamp, easing: ease });
  const top = Math.round(height * p.ratio);
  const speakerBox = p.speakerTop ? { top: 0, h: top } : { top, h: height - top };
  const contentBox = p.speakerTop ? { top, h: height - top } : { top: 0, h: top };
  return (
    <AbsoluteFill style={{ background: palette.background }}>
      <div style={{ position: "absolute", left: 0, width, top: contentBox.top, height: contentBox.h, overflow: "hidden" }}>
        <ContentView content={p.content} />
      </div>
      <div style={{ position: "absolute", left: 0, width, top: speakerBox.top, height: speakerBox.h, overflow: "hidden" }}>
        <SpeakerView width={width} height={speakerBox.h} focus={p.focus} anchor={{ x: 0.5, y: 0.42 }}>
          {speaker}
        </SpeakerView>
      </div>
      <div style={{ position: "absolute", top: top - 3, left: (width * (1 - line)) / 2, width: width * line, height: 6, background: palette.accent }} />
    </AbsoluteFill>
  );
};
