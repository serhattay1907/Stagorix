import { AbsoluteFill, interpolate, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Camera, WhipFlash } from "../effects/Camera";
import { Captions } from "../effects/Captions";
import { EmojiPop } from "../effects/EmojiPop";
import { Grade } from "../effects/Grade";
import { Label } from "../effects/Label";
import { NumberPop } from "../effects/NumberPop";
import { Outro } from "../effects/Outro";
import { CutoutLayer, TitleBehind } from "../effects/TitleBehind";
import { Transitions } from "../effects/Transition";
import { LOOKS } from "../theme/looks";
import { clamp } from "../theme/motion";
import { alpha, ThemeProvider, themeSchema, useTheme } from "../theme/theme";

// Every effect in one clip with sample content, in chapters. Used for review in
// Remotion Studio (edit the theme in the props panel), for the golden test, and
// later as the template picker. Sample text is English because the repo is.
export const showcaseSchema = z.object({
  theme: themeSchema,
  look: z.string().default("").describe("Ready-made look id (overrides theme), e.g. news, tech"),
  footage: z.string().default("").describe("Your 9:16 video in render/public; empty = stand-in speaker"),
  cutoutFrames: z.number().int().min(0).default(0).describe("Person cutout frames in render/public/<cutoutDir>"),
  cutoutDir: z.string().default("showcase-input/cutout"),
});
type ShowcaseProps = z.infer<typeof showcaseSchema>;

export const SHOWCASE_SECONDS = 36;
const FACE = { x: 540, y: 700 };
const WHIPS = [3, 30.2];
const TRANSITIONS = [
  { kind: "glitch" as const, at: 22.0 },
  { kind: "iris" as const, at: 24.7 },
  { kind: "zoomblur" as const, at: 27.4 },
];
const SHAKES = [13.9];

const sampleWords = (text: string, start: number, step = 0.32) =>
  text.split(" ").map((w, i) => ({ text: w, start: start + i * step, end: start + i * step + step * 0.85 }));

// A lit studio backdrop with soft bokeh, so the clip needs no media files.
export const Stage: React.FC = () => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const drift = frame * 0.15;
  const dots = [
    [140, 380, 120, 0.22], [880, 300, 160, 0.18], [960, 980, 90, 0.2], [120, 1180, 140, 0.16],
    [760, 1500, 110, 0.14], [300, 160, 70, 0.2], [620, 120, 100, 0.12], [40, 760, 80, 0.15],
  ];
  return (
    <AbsoluteFill style={{ background: palette.background, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 45% at 50% 38%, ${alpha(palette.accent, 0.16)}, transparent 70%), radial-gradient(ellipse 90% 60% at 50% 100%, ${alpha(palette.surface, 1)}, transparent 70%)`,
        }}
      />
      {dots.map(([x, y, r, o], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - r + Math.sin((drift + i * 40) / 60) * 20,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            background: alpha(i % 3 ? palette.muted : palette.accent, o),
            filter: "blur(18px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// Stand-in speaker: soft-lit silhouette with a rim light and a slow breath.
export const Speaker: React.FC = () => {
  const { palette } = useTheme();
  const frame = useCurrentFrame();
  const breath = 1 + Math.sin(frame / 22) * 0.006;
  const fill = `linear-gradient(160deg, ${alpha(palette.muted, 0.55)}, ${alpha(palette.surface, 1)} 70%)`;
  const rim = `0 0 0 3px ${alpha(palette.accent, 0.35)}, 0 0 60px ${alpha(palette.accent, 0.18)}`;
  return (
    <AbsoluteFill style={{ transform: `scale(${breath})`, transformOrigin: `${FACE.x}px 1920px` }}>
      <div style={{ position: "absolute", left: FACE.x - 140, top: FACE.y - 185, width: 280, height: 350, borderRadius: "48% 48% 46% 46%", background: fill, boxShadow: rim }} />
      <div style={{ position: "absolute", left: FACE.x - 60, top: FACE.y + 150, width: 120, height: 120, background: fill }} />
      <div style={{ position: "absolute", left: FACE.x - 340, top: FACE.y + 230, width: 680, height: 1000, borderRadius: "300px 300px 0 0", background: fill, boxShadow: rim }} />
    </AbsoluteFill>
  );
};

// Chapter title in the corner, so the viewer knows which effect is on screen.
export const Chapter: React.FC<{ index: number; name: string }> = ({ index, name }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 72, bottom: 150, opacity: o, fontFamily: theme.font.body, display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color: theme.palette.background, background: theme.palette.accent, padding: "4px 10px", borderRadius: 6 }}>
        {String(index).padStart(2, "0")}
      </span>
      <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, color: alpha(theme.palette.text, 0.85) }}>{name.toUpperCase()}</span>
    </div>
  );
};

const CHAPTERS: [number, number, string][] = [
  [0, 3, "Title behind speaker"],
  [3, 5.2, "Whip · label"],
  [5.2, 8, "Captions · highlight"],
  [8, 10.6, "Captions · boxed · punch-ins"],
  [10.6, 13, "Captions · pop"],
  [13, 15.8, "Captions · bold · emoji · shake"],
  [15.8, 18.6, "Captions · reveal"],
  [18.6, 21.2, "Number pop"],
  [21.2, 23.4, "Transition · glitch"],
  [23.4, 26.1, "Transition · iris"],
  [26.1, 29.6, "Transition · zoom blur"],
  [29.6, 36, "Whip · outro card"],
];

// Your own 9:16 footage (muted, looped) or the stand-in stage.
const Background: React.FC<{ footage: string }> = ({ footage }) => {
  const { durationInFrames } = useVideoConfig();
  if (!footage) return <Stage />;
  return (
    <Loop durationInFrames={durationInFrames}>
      <OffthreadVideo src={staticFile(footage)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Loop>
  );
};

const Scenes: React.FC<Omit<ShowcaseProps, "theme" | "look">> = ({ footage, cutoutFrames, cutoutDir }) => {
  const { fps } = useVideoConfig();
  const s = (seconds: number) => Math.round(seconds * fps);
  const zooms = [
    { at: 0, scale: 1.02 },
    { at: 0.1, scale: 1.1, ease: 2.8 },
    { at: 3.2, scale: 1.03 },
    { at: 8.3, scale: 1.14, ease: 0.15 },
    { at: 9.3, scale: 1.0, ease: 0.15 },
    { at: 10.1, scale: 1.14, ease: 0.15 },
    { at: 10.7, scale: 1.05, ease: 0.3 },
  ];
  const camera = { origin: FACE, whips: WHIPS, shakes: SHAKES, zooms };
  return (
    <AbsoluteFill>
      <Transitions items={TRANSITIONS} origin={FACE}>
        <Camera {...camera}>
          <Background footage={footage} />
        </Camera>
        <Sequence durationInFrames={s(3)}>
          <TitleBehind
            until={3}
            lines={[
              { text: "THIS IS", at: 0.2 },
              { text: "THE HOOK", at: 0.6, accent: true },
            ]}
          />
        </Sequence>
        <Camera {...camera}>{footage ? <CutoutLayer dir={cutoutDir} frames={cutoutFrames} /> : <Speaker />}</Camera>
        <Label text="What does it take?" from={3.3} to={5.1} position="upper" />
        <Captions words={sampleWords("Every word is timed, and keywords stand out.", 5.3)} keywords={["keywords"]} style="highlight" />
        <Captions words={sampleWords("A boxed style keeps captions readable anywhere.", 8.1)} keywords={["readable"]} style="boxed" position="lower" />
        <Captions words={sampleWords("One word. Big. Fast.", 10.7, 0.55)} keywords={["big"]} style="pop" />
        <Captions words={sampleWords("This is the loud style that grabs attention.", 13.1)} keywords={["loud"]} style="bold" />
        <EmojiPop emoji="🔥" at={13.9} />
        <Captions words={sampleWords("Words appear the moment they are spoken.", 15.9)} keywords={["spoken"]} style="reveal" />
        <NumberPop value={73} suffix="%" caption="of viewers watch on mute" at={18.6} />
        <Captions words={sampleWords("Sections can change with a glitch,", 21.4)} keywords={["glitch"]} />
        <Captions words={sampleWords("with an iris in the brand colour,", 24.0)} keywords={["iris"]} />
        <Captions words={sampleWords("or with a fast zoom blur.", 26.8)} keywords={["zoom"]} />
        <Outro
          from={30.5}
          heading="Be honest:"
          title="How many can you say YES to?"
          highlight="YES"
          items={["Plan it", "Build it", "Ship it", "Sell it"]}
          cta="Write your number below 👇"
          origin={FACE}
        />
      </Transitions>
      {CHAPTERS.map(([from, to, name], i) => (
        <Sequence key={name} from={s(from)} durationInFrames={s(to - from)}>
          <Chapter index={i + 1} name={name} />
        </Sequence>
      ))}
      <Grade leaks={WHIPS} label="STAGORIX · EFFECT SHOWCASE" />
      <WhipFlash whips={WHIPS} />
    </AbsoluteFill>
  );
};

export const Showcase: React.FC<ShowcaseProps> = ({ theme, look, ...rest }) => (
  <ThemeProvider value={look in LOOKS ? LOOKS[look as keyof typeof LOOKS].theme : theme}>
    <Scenes {...rest} />
  </ThemeProvider>
);
