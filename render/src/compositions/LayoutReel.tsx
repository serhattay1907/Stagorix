import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { z } from "zod";
import { Captions } from "../effects/Captions";
import { Grade } from "../effects/Grade";
import { BackgroundSwap } from "../layouts/BackgroundSwap";
import { CardOverFace } from "../layouts/CardOverFace";
import { FootageSpeaker, focusSchema } from "../layouts/common/views";
import { FullFace } from "../layouts/FullFace";
import LAYOUT_DATA from "../layouts/layouts.json";
import { PhoneFrame } from "../layouts/PhoneFrame";
import { PictureInPicture } from "../layouts/PictureInPicture";
import { Reaction } from "../layouts/Reaction";
import { ScreenFace } from "../layouts/ScreenFace";
import { SplitScreen } from "../layouts/SplitScreen";
import { TextOnly } from "../layouts/TextOnly";
import type { Position } from "../theme/layout";
import { LOOKS } from "../theme/looks";
import { neutralTheme, ThemeProvider, themeSchema } from "../theme/theme";
import { Chapter, Speaker, Stage } from "./Showcase";

// Every layout, one short scene each, with the speaker (your footage or the stand-in)
// and stand-in content. Used to compare layouts and in the golden test.
export const LAYOUT_SECONDS = 3.6;
export const LAYOUT_IDS = Object.keys(LAYOUT_DATA) as (keyof typeof LAYOUT_DATA)[];
export const LAYOUT_REEL_SECONDS = LAYOUT_SECONDS * LAYOUT_IDS.length;

export const layoutReelSchema = z.object({
  theme: themeSchema.default(neutralTheme),
  look: z.string().default(""),
  footage: z.string().default("").describe("Your 9:16 video in render/public; empty = stand-in speaker"),
  focus: focusSchema.default({ x: 540, y: 700 }),
  matteDir: z.string().default(""),
  matteFrames: z.number().int().min(0).default(0),
  matteFps: z.number().positive().default(30),
});
type LayoutReelProps = z.input<typeof layoutReelSchema>;

const words = (text: string, start: number, step = 0.3) =>
  text.split(" ").map((w, i) => ({ text: w, start: start + i * step, end: start + i * step + step * 0.85 }));

type Matte = { matteDir: string; matteFrames: number; matteFps: number };

const Scene: React.FC<{
  id: (typeof LAYOUT_IDS)[number];
  index: number;
  footage: string;
  focus: { x: number; y: number };
  matte: Matte;
}> = ({ id, index, footage, focus, matte }) => {
  const info = LAYOUT_DATA[id];
  const speaker = footage ? (
    <FootageSpeaker src={footage} />
  ) : (
    <AbsoluteFill>
      <Stage />
      <Speaker />
    </AbsoluteFill>
  );
  const layout = {
    full: <FullFace speaker={speaker} focus={focus} />,
    split: <SplitScreen speaker={speaker} focus={focus} content={{ kind: "broll" }} />,
    card: <CardOverFace speaker={speaker} focus={focus} content={{ kind: "broll" }} label="Source: your own footage" />,
    phone: <PhoneFrame speaker={speaker} focus={focus} title="Your video, framed" />,
    pip: <PictureInPicture speaker={speaker} focus={focus} content={{ kind: "screen" }} />,
    broll: <PictureInPicture speaker={speaker} focus={focus} content={{ kind: "broll" }} shape="circle" corner="bottom-left" kenBurns />,
    bgswap: (
      <BackgroundSwap
        person={<Speaker />}
        matte={footage && matte.matteDir ? { src: footage, matteDir: matte.matteDir, matteFps: matte.matteFps, matteFrames: matte.matteFrames } : undefined}
      />
    ),
    reaction: <Reaction speaker={speaker} focus={focus} content={{ kind: "broll" }} credit="Original clip: the creator's name" />,
    screen: <ScreenFace speaker={speaker} focus={focus} />,
    text: <TextOnly lines={["Some things", "are better", "said plainly."]} highlight="plainly" />,
  }[id];
  return (
    <AbsoluteFill>
      {layout}
      {info.captions !== "none" && (
        <Captions words={words(`This is the ${info.name.toLowerCase()} layout.`, 0.5)} keywords={[info.name.split(" ")[0]]} position={info.captions as Position} />
      )}
      <Chapter index={index + 1} name={`Layout · ${info.name}`} />
    </AbsoluteFill>
  );
};

export const LayoutReel: React.FC<LayoutReelProps> = (props) => {
  const p = layoutReelSchema.parse(props);
  const { fps } = useVideoConfig();
  const len = Math.round(LAYOUT_SECONDS * fps);
  const theme = p.look in LOOKS ? LOOKS[p.look as keyof typeof LOOKS].theme : p.theme;
  return (
    <ThemeProvider value={theme}>
      <AbsoluteFill>
        {LAYOUT_IDS.map((id, i) => (
          <Sequence key={id} from={i * len} durationInFrames={len}>
            <Scene id={id} index={i} footage={p.footage} focus={p.focus} matte={p} />
          </Sequence>
        ))}
        <Grade label="STAGORIX · LAYOUTS" />
      </AbsoluteFill>
    </ThemeProvider>
  );
};
