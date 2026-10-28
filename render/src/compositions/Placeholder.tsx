import { zColor } from "@remotion/zod-types";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

// Skeleton composition proving the toolchain works. Brand values arrive as props,
// never as constants (principle 1). Replaced by the effect library in phase 3.3.
export const placeholderSchema = z.object({
  title: z.string(),
  background: zColor(),
  foreground: zColor(),
});

export const Placeholder: React.FC<z.infer<typeof placeholderSchema>> = ({ title, background, foreground }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: background, justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: foreground, fontSize: 96, fontFamily: "sans-serif", opacity }}>{title}</div>
    </AbsoluteFill>
  );
};
