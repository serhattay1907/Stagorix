import { Html5Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { z } from "zod";
import { useTheme } from "../theme/theme";
import SOUND_DATA from "./sounds.json";

// Sound effects on the timeline. Cues come from the edit plan (`stagorix` turns effects
// into cues, one per beat); files are built by `stagorix sounds build` into public/sounds.
// Level = category gain (the mix) x theme sound volume (the brand).
export const soundCueSchema = z.object({
  sound: z.string(),
  at: z.number().min(0).describe("Seconds where the file starts"),
});
export type SoundCue = z.infer<typeof soundCueSchema>;

type SoundEntry = (typeof SOUND_DATA.sounds)[number];
export const SOUNDS: Record<string, SoundEntry> = Object.fromEntries(SOUND_DATA.sounds.map((s) => [s.id, s]));
const GAINS = SOUND_DATA.categories as Record<string, { name: string; gain: number }>;

export const soundGain = (id: string) => GAINS[SOUNDS[id]?.category]?.gain ?? 0.5;
export const soundSrc = (id: string) => staticFile(`sounds/${id}.wav`);

export const Sfx: React.FC<{ cues: SoundCue[] }> = ({ cues }) => {
  const { fps } = useVideoConfig();
  const { sound } = useTheme();
  const unknown = cues.filter((c) => !(c.sound in SOUNDS)).map((c) => c.sound);
  if (unknown.length) throw new Error(`Unknown sound(s): ${unknown.join(", ")}; see \`stagorix sounds\``);
  if (sound.volume <= 0) return null;
  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.round(c.at * fps)} durationInFrames={Math.ceil((SOUNDS[c.sound].seconds + 0.1) * fps)} layout="none">
          <Html5Audio src={soundSrc(c.sound)} volume={soundGain(c.sound) * sound.volume} />
        </Sequence>
      ))}
    </>
  );
};
