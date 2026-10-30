import { AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp, ease } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";

// Effects that treat the speaker and the background separately, using a person matte:
// blur:     background softly out of focus, speaker sharp
// swap:     background replaced by a brand backdrop
// glow:     outline glow around the speaker in the accent colour
// colorpop: background drained to black and white, speaker in full colour
// Wrap the background in <SpeakerBackdrop> and put <SpeakerPerson> on top of it.
export const speakerFxKind = z.enum(["blur", "swap", "glow", "colorpop"]);
export const speakerFxSchema = z.object({
  items: z
    .array(z.object({ kind: speakerFxKind, at: z.number(), seconds: z.number().positive().default(2.5) }))
    .default([]),
});
export type SpeakerFxProps = z.input<typeof speakerFxSchema>;
type Item = z.infer<typeof speakerFxSchema>["items"][number];

const FADE = 0.3;

/** The active effect and how far it is faded in (0..1), or null. */
export const useSpeakerFx = (items: Item[]) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  for (const it of items) {
    if (t < it.at || t > it.at + it.seconds) continue;
    const k = interpolate(t, [it.at, it.at + FADE, it.at + it.seconds - FADE, it.at + it.seconds], [0, 1, 1, 0], {
      ...clamp,
      easing: ease,
    });
    return { kind: it.kind, k };
  }
  return null;
};

/** Brand backdrop for "swap": surface gradient, soft accent light and a fine grid. */
const Backdrop: React.FC = () => {
  const { palette } = useTheme();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 55% at 50% 35%, ${alpha(palette.accent, 0.35)}, transparent 70%), linear-gradient(180deg, ${palette.surface}, ${palette.background})`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha(palette.text, 0.06)} 2px, transparent 2px), linear-gradient(90deg, ${alpha(palette.text, 0.06)} 2px, transparent 2px)`,
          backgroundSize: "90px 90px",
        }}
      />
    </AbsoluteFill>
  );
};

export const SpeakerBackdrop: React.FC<SpeakerFxProps & { children?: React.ReactNode }> = ({ children, ...props }) => {
  const { items } = speakerFxSchema.parse(props);
  const fx = useSpeakerFx(items);
  const filter =
    fx?.kind === "blur"
      ? `blur(${18 * fx.k}px) brightness(${1 - 0.15 * fx.k})`
      : fx?.kind === "colorpop"
        ? `grayscale(${fx.k}) brightness(${1 - 0.25 * fx.k})`
        : undefined;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter, transform: fx?.kind === "blur" ? `scale(${1 + 0.04 * fx.k})` : undefined }}>
        {children}
      </AbsoluteFill>
      {fx?.kind === "swap" && (
        <AbsoluteFill style={{ opacity: fx.k }}>
          <Backdrop />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/** The speaker on top of the backdrop, with the glow when it is active. */
export const SpeakerPerson: React.FC<SpeakerFxProps & { children?: React.ReactNode; always?: boolean }> = ({
  children,
  always = false,
  ...props
}) => {
  const { items } = speakerFxSchema.parse(props);
  const { palette } = useTheme();
  const fx = useSpeakerFx(items);
  if (!fx && !always) return null;
  const glow = fx?.kind === "glow" ? fx.k : 0;
  return (
    <AbsoluteFill
      style={{
        filter: glow
          ? `drop-shadow(0 0 ${6 * glow}px ${palette.accent}) drop-shadow(0 0 ${28 * glow}px ${alpha(palette.accent, 0.7)})`
          : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// The speaker cut out of your footage with a per-frame matte (masks from `stagorix matte`).
export const mattedVideoSchema = z.object({
  src: z.string(),
  matteDir: z.string(),
  matteFps: z.number().positive(),
  matteFrames: z.number().int().min(0),
});
export const MattedVideo: React.FC<z.input<typeof mattedVideoSchema>> = (props) => {
  const { src, matteDir, matteFps, matteFrames } = mattedVideoSchema.parse(props);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const index = Math.min(Math.floor((frame / fps) * matteFps), Math.max(matteFrames - 1, 0));
  const mask = `url(${staticFile(`${matteDir}/${String(index).padStart(5, "0")}.png`)})`;
  // Mattes are greyscale (white = person), so the mask reads luminance, not alpha.
  return (
    <AbsoluteFill style={{ maskImage: mask, maskMode: "luminance", maskSize: "100% 100%" }}>
      <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};
