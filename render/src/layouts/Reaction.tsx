import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { SAFE } from "../theme/layout";
import { clamp, pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { ContentView, contentSchema, focusSchema, SpeakerBelow } from "./common/views";

// Reacting to a clip: the clip plays in a 16:9 player at the top with a progress bar and a
// credit line (always shown: the clip belongs to someone else); the speaker fills the rest.
export const reactionSchema = z.object({
  focus: focusSchema,
  content: contentSchema,
  credit: z.string().min(1).describe("Who made the clip, shown under the player"),
});
export type ReactionProps = z.input<typeof reactionSchema> & { speaker: React.ReactNode };

export const Reaction: React.FC<ReactionProps> = ({ speaker, ...props }) => {
  const p = reactionSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const s = pop(theme, frame, 0, fps);
  const left = width * SAFE.left;
  const w = width * (1 - SAFE.left - SAFE.right);
  const h = (w * 9) / 16;
  const top = height * SAFE.top + 30;
  const progress = interpolate(frame, [0, durationInFrames], [0.05, 0.6], clamp);
  return (
    <AbsoluteFill>
      <SpeakerBelow focus={p.focus} faceAt={0.64}>
        {speaker}
      </SpeakerBelow>
      <div style={{ position: "absolute", left, top, width: w, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [-60, 0])}px)` }}>
        <div
          style={{
            position: "relative",
            width: w,
            height: h,
            borderRadius: radiusPx(theme, 120),
            overflow: "hidden",
            boxShadow: `0 30px 70px ${alpha(palette.background, 0.65)}`,
            border: `4px solid ${alpha(palette.text, 0.9)}`,
          }}
        >
          <ContentView content={p.content} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: alpha(palette.text, 0.25) }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", background: palette.negative }} />
          </div>
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: theme.font.body,
            fontWeight: 700,
            fontSize: 28,
            color: alpha(palette.text, 0.9),
            textShadow: `0 2px 10px ${alpha(palette.background, 0.9)}`,
          }}
        >
          ▶ {p.credit}
        </div>
      </div>
    </AbsoluteFill>
  );
};
