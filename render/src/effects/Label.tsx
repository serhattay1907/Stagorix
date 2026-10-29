import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { positionSchema, yFor } from "../theme/layout";
import { clamp, pop, sec } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";

// A short line in a frosted pill (question, topic, speaker name).
export const labelSchema = z.object({
  text: z.string(),
  from: z.number(),
  to: z.number(),
  position: positionSchema.default("middle"),
  fontSize: z.number().default(64),
});
export type LabelProps = z.input<typeof labelSchema>;

export const Label: React.FC<LabelProps> = (props) => {
  const { text, from, to, position, fontSize } = labelSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = pop(theme, frame, sec(from, fps), fps);
  const out = interpolate(frame, [sec(to, fps) - 4, sec(to, fps) + 4], [1, 0], clamp);
  if (frame < sec(from, fps) || frame > sec(to, fps) + 4) return null;
  const pad = fontSize * 0.25;
  return (
    <div
      style={{
        position: "absolute",
        top: yFor(position, height),
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: s * out,
        transform: `translateY(-50%) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
      }}
    >
      <div
        style={{
          fontFamily: theme.font.body,
          fontWeight: 800,
          fontSize,
          color: theme.palette.text,
          background: alpha(theme.palette.surface, 0.65),
          padding: `${pad}px ${pad * 2.2}px`,
          borderRadius: radiusPx(theme, fontSize + pad * 2),
          backdropFilter: "blur(12px)",
        }}
      >
        {text}
      </div>
    </div>
  );
};
