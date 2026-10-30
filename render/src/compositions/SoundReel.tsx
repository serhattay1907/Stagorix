import { AbsoluteFill, type CalculateMetadataFunction, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Grade } from "../effects/Grade";
import { Sfx, SOUNDS } from "../sound/Sfx";
import SOUND_DATA from "../sound/sounds.json";
import { clamp } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { Stage } from "./Showcase";

// Plays sounds one after another with their name, category and license on screen,
// so the user can listen and pick (`stagorix sounds --render`).
export const soundReelSchema = z.object({
  sounds: z.array(z.string()).describe("Sound ids, in order"),
});
type SoundReelProps = z.infer<typeof soundReelSchema>;

const GAP = 0.45;
const FPS = 30; // matches VIDEO in Root.tsx
const slot = (id: string) => Math.max(1.1, SOUNDS[id].seconds + GAP);

export const soundReelMetadata: CalculateMetadataFunction<SoundReelProps> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.round(FPS * props.sounds.reduce((t, id) => t + slot(id), 0.5))),
});

const PACKS = SOUND_DATA.packs as Record<string, { name: string; license: string; author: string }>;
const CATEGORIES = SOUND_DATA.categories as Record<string, { name: string }>;

const Card: React.FC<{ id: string; index: number; total: number }> = ({ id, index, total }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = SOUNDS[id];
  const pack = PACKS[s.pack];
  const play = interpolate(frame, [0, s.seconds * fps], [0, 1], clamp);
  const o = interpolate(frame, [0, 4, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], clamp);
  const { palette } = theme;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: o, fontFamily: theme.font.body }}>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: palette.muted }}>
        {index + 1} / {total}
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 34,
          fontWeight: 800,
          color: palette.background,
          background: palette.accent,
          padding: "6px 22px",
          borderRadius: radiusPx(theme, 60),
        }}
      >
        {CATEGORIES[s.category].name.toUpperCase()}
      </div>
      <div style={{ marginTop: 30, fontFamily: theme.font.display, fontWeight: 900, fontSize: 92, color: palette.text }}>{id}</div>
      <div style={{ marginTop: 50, width: 760, height: 14, borderRadius: 7, background: alpha(palette.text, 0.15), overflow: "hidden" }}>
        <div style={{ width: `${play * 100}%`, height: "100%", background: palette.accent }} />
      </div>
      <div style={{ marginTop: 40, fontSize: 30, fontWeight: 500, color: alpha(palette.text, 0.75), textAlign: "center", lineHeight: 1.5 }}>
        {pack.name} · {pack.author}
        <br />
        {pack.license} · {s.seconds.toFixed(2)} s
      </div>
    </AbsoluteFill>
  );
};

export const SoundReel: React.FC<SoundReelProps> = ({ sounds }) => {
  const { fps } = useVideoConfig();
  let t = 0.25;
  const slots = sounds.map((id) => {
    const from = t;
    t += slot(id);
    return { id, from, len: slot(id) };
  });
  return (
    <AbsoluteFill>
      <Stage />
      {slots.map(({ id, from, len }, i) => (
        <Sequence key={i} from={Math.round(from * fps)} durationInFrames={Math.round(len * fps)}>
          <Card id={id} index={i} total={sounds.length} />
        </Sequence>
      ))}
      <Sfx cues={slots.map(({ id, from }) => ({ sound: id, at: from }))} />
      <Grade label="STAGORIX · SOUNDS" />
    </AbsoluteFill>
  );
};
