import { AbsoluteFill, Img, interpolate, Loop, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp, ease } from "../../theme/motion";
import { alpha, useTheme } from "../../theme/theme";
import { cropToBox } from "./crop";

// Building blocks shared by the layouts: the speaker shot cropped into any box, and the
// content (your image or video, or a stand-in when none is given).

export const focusSchema = z.object({ x: z.number(), y: z.number() }).describe("Face position in the 1080x1920 frame");
export const contentSchema = z
  .object({ src: z.string().default(""), kind: z.enum(["image", "video", "broll", "screen"]).default("broll") })
  .describe("Your file in render/public, or a stand-in (broll, screen)");
export type Focus = z.infer<typeof focusSchema>;
export type Content = z.input<typeof contentSchema>;

/** Full-frame speaker (stand-in or footage) placed into a box, cropped around the face. */
export const SpeakerView: React.FC<{
  width: number;
  height: number;
  focus: Focus;
  zoom?: number;
  anchor?: { x: number; y: number };
  children: React.ReactNode;
}> = ({ width, height, focus, zoom = 1, anchor, children }) => {
  const frame = useVideoConfig();
  const c = cropToBox(frame, { width, height }, focus, anchor, zoom);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: frame.width,
          height: frame.height,
          transformOrigin: "0 0",
          transform: `translate(${c.x}px, ${c.y}px) scale(${c.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Footage as the speaker, looped and muted, or nothing when there is none. */
export const FootageSpeaker: React.FC<{ src: string }> = ({ src }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Loop durationInFrames={durationInFrames}>
      <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Loop>
  );
};

/** Stand-in B-roll: a stylised outdoor scene in the theme colours, slowly drifting. */
const BrollStandIn: React.FC = () => {
  const theme = useTheme();
  const { palette } = theme;
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${alpha(palette.accent, 0.35)}, ${palette.surface} 60%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 640 - f * 0.6, top: 180, width: 260, height: 260, borderRadius: "50%", background: alpha(palette.accent, 0.8), filter: "blur(2px)" }} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: -200 + i * 420 - f * (0.4 + i * 0.3),
            bottom: -80,
            width: 900,
            height: 520 - i * 90,
            borderRadius: "50% 50% 0 0",
            background: alpha(i % 2 ? palette.muted : palette.background, 0.55 + i * 0.12),
          }}
        />
      ))}
      <div style={{ position: "absolute", left: 40, top: 36, fontFamily: theme.font.body, fontSize: 30, fontWeight: 800, letterSpacing: 4, color: alpha(palette.text, 0.7) }}>
        B-ROLL
      </div>
    </AbsoluteFill>
  );
};

/** Stand-in screen recording: a simple app interface in the theme colours. */
const ScreenStandIn: React.FC = () => {
  const theme = useTheme();
  const { palette } = theme;
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: palette.background, padding: 40, fontFamily: theme.font.body }}>
      <div style={{ height: 70, borderRadius: 16, background: palette.surface, display: "flex", alignItems: "center", padding: "0 24px", gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: alpha(palette.text, 0.3) }} />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            marginTop: 28,
            height: 110,
            borderRadius: 18,
            background: i === Math.floor(f / 20) % 5 ? alpha(palette.accent, 0.35) : palette.surface,
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 24px",
          }}
        >
          <div style={{ width: 62, height: 62, borderRadius: 14, background: alpha(palette.accent, 0.8) }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 18, width: `${70 - i * 8}%`, borderRadius: 9, background: alpha(palette.text, 0.6) }} />
            <div style={{ height: 14, width: `${45 + i * 6}%`, borderRadius: 7, background: alpha(palette.text, 0.25), marginTop: 14 }} />
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** The content of a layout: the user's image or video, or a stand-in. */
export const ContentView: React.FC<{ content: Content }> = ({ content }) => {
  const c = contentSchema.parse(content);
  if (c.src && c.kind === "image") return <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  if (c.src && c.kind === "video")
    return <OffthreadVideo src={staticFile(c.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  return c.kind === "screen" ? <ScreenStandIn /> : <BrollStandIn />;
};

/** Slow push-in on still or B-roll content (Ken Burns), so a static shot keeps moving. */
export const KenBurns: React.FC<{ amount?: number; children: React.ReactNode }> = ({ amount = 0.08, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = Math.min(1, frame / Math.max(1, durationInFrames));
  return <AbsoluteFill style={{ transform: `scale(${1 + amount * k})`, transformOrigin: "50% 40%" }}>{children}</AbsoluteFill>;
};

/** The speaker slid down so the face sits at `faceAt` (share of the height), over a blurred
 *  copy of the same shot; leaves the top of the frame free for a card or a player. */
export const SpeakerBelow: React.FC<{ focus: Focus; faceAt: number; children: React.ReactNode }> = ({ focus, faceAt, children }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const slide = interpolate(frame, [0, 0.45 * fps], [0, 1], { ...clamp, easing: ease });
  const shift = Math.max(0, height * faceAt - focus.y) * slide;
  const fade = `linear-gradient(180deg, transparent 0px, black ${Math.min(shift, 160)}px)`;
  return (
    <AbsoluteFill style={{ background: theme.palette.background }}>
      <AbsoluteFill style={{ filter: "blur(28px) brightness(0.55)", transform: "scale(1.1)" }}>
        <SpeakerView width={width} height={height} focus={focus}>
          {children}
        </SpeakerView>
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateY(${shift}px)`, maskImage: fade, WebkitMaskImage: fade }}>
        <SpeakerView width={width} height={height} focus={focus}>
          {children}
        </SpeakerView>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
