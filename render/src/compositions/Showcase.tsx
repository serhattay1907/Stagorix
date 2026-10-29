import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Camera, WhipFlash } from "../effects/Camera";
import { Captions } from "../effects/Captions";
import { Grade } from "../effects/Grade";
import { Label } from "../effects/Label";
import { Outro } from "../effects/Outro";
import { TitleBehind } from "../effects/TitleBehind";
import { alpha, ThemeProvider, themeSchema, useTheme } from "../theme/theme";

// Every effect in one clip with sample content, for review in Remotion Studio
// (change the theme in the props panel) and for the golden test. Sample text is
// English only because the repo is; real content comes in the brand's language.
export const showcaseSchema = z.object({ theme: themeSchema });

export const SHOWCASE_SECONDS = 16;
const FACE = { x: 540, y: 760 };
const WHIPS = [3];

const sampleWords = (text: string, start: number, step = 0.34) =>
  text.split(" ").map((w, i) => ({ text: w, start: start + i * step, end: start + i * step + step * 0.85 }));

// A stand-in speaker, so the clip needs no media files.
const Stage: React.FC = () => {
  const { palette } = useTheme();
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(circle at 50% 35%, ${palette.surface}, ${palette.background} 75%)` }}
    />
  );
};

const Speaker: React.FC = () => {
  const { palette } = useTheme();
  const body = alpha(palette.muted, 0.9);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: FACE.x - 150, top: FACE.y - 190, width: 300, height: 360, borderRadius: "50%", background: body }} />
      <div
        style={{ position: "absolute", left: FACE.x - 330, top: FACE.y + 210, width: 660, height: 1100, borderRadius: "320px 320px 0 0", background: body }}
      />
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ name: string }> = ({ name }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 72,
        fontFamily: theme.font.body,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: 3,
        color: alpha(theme.palette.text, 0.7),
      }}
    >
      {name.toUpperCase()}
    </div>
  );
};

const Scenes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (seconds: number) => Math.round(seconds * fps);
  const t = frame / fps;
  return (
    <AbsoluteFill>
      <Camera
        origin={FACE}
        whips={WHIPS}
        zooms={[
          { at: 0, scale: 1.02 },
          { at: 0.1, scale: 1.12, ease: 2.8 },
          { at: 3.2, scale: 1.04 },
          { at: 8, scale: 1.16, ease: 0.15 },
          { at: 9, scale: 1.0, ease: 0.15 },
          { at: 10, scale: 1.16, ease: 0.15 },
          { at: 11, scale: 1.0, ease: 0.3 },
        ]}
      >
        <Stage />
        {t >= 3 && <Speaker />}
      </Camera>
      <Sequence durationInFrames={s(3)}>
        <TitleBehind
          until={3}
          top={470}
          lines={[
            { text: "THIS IS", at: 0.2 },
            { text: "THE HOOK", at: 0.7, accent: true },
          ]}
        />
        <Camera origin={FACE} whips={WHIPS} zooms={[{ at: 0, scale: 1.02 }, { at: 0.1, scale: 1.12, ease: 2.8 }]}>
          <Speaker />
        </Camera>
        <Tag name="Title behind speaker · camera push" />
      </Sequence>
      <Label text="What does it take?" from={3.3} to={5.2} />
      <Captions
        words={sampleWords("Captions follow every word, and keywords stand out. Groups break at punctuation.", 5.4, 0.3)}
        keywords={["keywords", "punctuation"]}
      />
      <Sequence from={s(3)} durationInFrames={s(5)}>
        <Tag name="Whip · label · captions" />
      </Sequence>
      <Sequence from={s(8)} durationInFrames={s(3)}>
        <Tag name="Punch-in zooms" />
      </Sequence>
      <Outro
        from={11.2}
        heading="Be honest:"
        title="How many can you say YES to?"
        highlight="YES"
        items={["Plan it", "Build it", "Ship it", "Sell it"]}
        cta="Write your number below 👇"
        origin={FACE}
      />
      <Grade leaks={[3, 11.2]} label="STAGORIX · SHOWCASE" />
      <WhipFlash whips={WHIPS} />
    </AbsoluteFill>
  );
};

export const Showcase: React.FC<z.infer<typeof showcaseSchema>> = ({ theme }) => (
  <ThemeProvider value={theme}>
    <Scenes />
  </ThemeProvider>
);
