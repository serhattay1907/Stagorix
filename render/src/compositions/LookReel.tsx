import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Captions } from "../effects/Captions";
import { Grade } from "../effects/Grade";
import { Label } from "../effects/Label";
import { TitleBehind } from "../effects/TitleBehind";
import { LOOK_IDS, LOOKS } from "../theme/looks";
import { ThemeProvider } from "../theme/theme";
import { Chapter, Speaker, Stage } from "./Showcase";

// Every ready-made look, one short scene each: same content, different look.
// Used to compare looks and in the golden test.
export const LOOK_SECONDS = 3.6;
export const LOOK_REEL_SECONDS = LOOK_SECONDS * LOOK_IDS.length;

const sampleWords = (text: string, start: number, step = 0.3) =>
  text.split(" ").map((w, i) => ({ text: w, start: start + i * step, end: start + i * step + step * 0.85 }));

const LookScene: React.FC<{ index: number; id: (typeof LOOK_IDS)[number] }> = ({ index, id }) => {
  const look = LOOKS[id];
  return (
    <ThemeProvider value={look.theme}>
      <AbsoluteFill>
        <Stage />
        <TitleBehind until={LOOK_SECONDS} lines={[{ text: look.name.toUpperCase(), at: 0.1, accent: true }]} />
        <Speaker />
        <Label text={look.description} from={0.5} to={1.4} position="top" fontSize={44} />
        <Captions words={sampleWords(`This is the ${look.name} look for your brand.`, 1.4)} keywords={[look.name]} />
        <Chapter index={index + 1} name={`Look · ${look.name}`} />
        <Grade label="STAGORIX · LOOKS" />
      </AbsoluteFill>
    </ThemeProvider>
  );
};

export const LookReel: React.FC = () => {
  const { fps } = useVideoConfig();
  const len = Math.round(LOOK_SECONDS * fps);
  return (
    <AbsoluteFill>
      {LOOK_IDS.map((id, i) => (
        <Sequence key={id} from={i * len} durationInFrames={len}>
          <LookScene index={i} id={id} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
