import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { pop } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";
import { ContentView, contentSchema, focusSchema, SpeakerView } from "./common/views";

// A phone on a brand backdrop holding the speaker (like a video call) or a screen recording,
// with an optional title above it.
export const phoneFrameSchema = z.object({
  focus: focusSchema,
  screen: z.enum(["speaker", "content"]).default("speaker"),
  content: contentSchema.default({ src: "", kind: "screen" }),
  title: z.string().default(""),
});
export type PhoneFrameProps = z.input<typeof phoneFrameSchema> & { speaker: React.ReactNode };

const PHONE = { w: 600, h: 1220, bezel: 22, radius: 84 };

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ speaker, ...props }) => {
  const p = phoneFrameSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = pop(theme, frame, 0, fps);
  const sw = PHONE.w - PHONE.bezel * 2;
  const sh = PHONE.h - PHONE.bezel * 2;
  const top = height * 0.2;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 45% at 50% 45%, ${alpha(palette.accent, 0.3)}, transparent 70%), linear-gradient(180deg, ${palette.surface}, ${palette.background})`,
      }}
    >
      {p.title && (
        <div
          style={{
            position: "absolute",
            top: height * 0.08,
            left: 60,
            right: 60,
            textAlign: "center",
            fontFamily: theme.font.display,
            fontWeight: 900,
            fontSize: 76,
            lineHeight: 1.05,
            color: palette.text,
            opacity: pop(theme, frame, 6, fps),
          }}
        >
          {p.title}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: (width - PHONE.w) / 2,
          top,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: PHONE.radius,
          background: "#0B0B0D",
          boxShadow: `0 0 0 4px ${alpha(palette.text, 0.18)}, 0 50px 100px ${alpha(palette.background, 0.7)}`,
          transform: `translateY(${interpolate(s, [0, 1], [300, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          opacity: Math.min(1, s * 1.4),
        }}
      >
        <div style={{ position: "absolute", left: PHONE.bezel, top: PHONE.bezel, width: sw, height: sh, borderRadius: PHONE.radius - PHONE.bezel, overflow: "hidden", background: palette.background }}>
          {p.screen === "speaker" ? (
            <SpeakerView width={sw} height={sh} focus={p.focus} anchor={{ x: 0.5, y: 0.4 }}>
              {speaker}
            </SpeakerView>
          ) : (
            <div style={{ position: "relative", width: sw, height: sh }}>
              <ContentView content={p.content} />
            </div>
          )}
          <div style={{ position: "absolute", top: 18, left: sw / 2 - 70, width: 140, height: 34, borderRadius: 17, background: "#0B0B0D" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
