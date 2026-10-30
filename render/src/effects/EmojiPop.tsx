import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, yFor } from "../theme/layout";
import { amount, clamp, pop, sec } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";

// An emoji that pops in like a sticker when a word is said. Emoji come from the
// Noto Color Emoji font in the image (OFL), so they look the same on every OS.
export const emojiPopSchema = z.object({
  emoji: z.string().min(1),
  at: z.number(),
  seconds: z.number().positive().default(1.2),
  position: positionSchema.default("upper"),
  side: z.enum(["left", "center", "right"]).default("right"),
  size: z.number().default(170),
});
export type EmojiPopProps = z.input<typeof emojiPopSchema>;

export const EmojiPop: React.FC<EmojiPopProps> = (props) => {
  const { emoji, at, seconds, position, side, size } = emojiPopSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const start = sec(at, fps);
  const end = sec(at + seconds, fps);
  if (frame < start || frame > end) return null;
  const s = pop(theme, frame, start, fps, -4);
  const out = interpolate(frame, [end - 6, end], [1, 0], clamp);
  const tilt = (side === "left" ? -1 : 1) * amount(theme, 12);
  const wobble = Math.sin((frame - start) / 4) * amount(theme, 3) * (1 - out * 0.5);
  const x = { left: width * 0.2, center: width * 0.5, right: width * 0.72 }[side];
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: yFor(position, height) - size / 2,
        width: size,
        height: size,
        fontSize: size * 0.8,
        lineHeight: `${size}px`,
        textAlign: "center",
        fontFamily: "'Noto Color Emoji', sans-serif",
        opacity: out,
        transform: `scale(${interpolate(s, [0, 1], [0.2, 1])}) rotate(${interpolate(s, [0, 1], [0, tilt]) + wobble}deg)`,
        filter: `drop-shadow(0 12px 22px ${alpha(theme.palette.background, 0.55)})`,
      }}
    >
      {emoji}
    </div>
  );
};
