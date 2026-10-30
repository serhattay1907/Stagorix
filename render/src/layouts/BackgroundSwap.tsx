import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { MattedVideo, mattedVideoSchema } from "../effects/SpeakerFx";
import { pop } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";
import { ContentView, contentSchema, KenBurns } from "./common/views";

// The speaker cut out of the footage (person matte) in front of a new background: the
// brand backdrop, or your own image or video.
export const backgroundSwapSchema = z.object({
  background: contentSchema.optional().describe("Image or video behind the speaker; empty = brand backdrop"),
  matte: mattedVideoSchema.optional().describe("Footage and mattes; empty = the stand-in person"),
});
export type BackgroundSwapProps = z.input<typeof backgroundSwapSchema> & { person: React.ReactNode };

export const BackgroundSwap: React.FC<BackgroundSwapProps> = ({ person, ...props }) => {
  const p = backgroundSwapSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = pop(theme, frame, 0, fps);
  return (
    <AbsoluteFill style={{ background: palette.background }}>
      {p.background ? (
        <KenBurns amount={0.05}>
          <ContentView content={p.background} />
        </KenBurns>
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 75% 50% at 50% 35%, ${alpha(palette.accent, 0.35 * glow)}, transparent 70%), linear-gradient(180deg, ${palette.surface}, ${palette.background})`,
          }}
        >
          <AbsoluteFill
            style={{
              backgroundImage: `linear-gradient(${alpha(palette.text, 0.05)} 2px, transparent 2px), linear-gradient(90deg, ${alpha(palette.text, 0.05)} 2px, transparent 2px)`,
              backgroundSize: "90px 90px",
            }}
          />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ filter: `drop-shadow(0 30px 60px ${alpha(palette.background, 0.6)})` }}>
        {p.matte ? <MattedVideo {...p.matte} /> : person}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
