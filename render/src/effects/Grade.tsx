import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";

// Finishing layer: vignette, film grain, light leaks, progress bar and a small label.
export const gradeSchema = z.object({
  vignette: z.number().min(0).max(1).default(0.55),
  grain: z.number().min(0).max(1).default(0.07),
  leaks: z.array(z.number()).default([]).describe("Seconds where a warm light leak sweeps across"),
  progress: z.boolean().default(true),
  label: z.string().default("").describe("Small text at the top, e.g. the channel name"),
});
export type GradeProps = z.input<typeof gradeSchema>;

export const Grade: React.FC<GradeProps> = (props) => {
  const { vignette, grain, leaks, progress, label } = gradeSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const leak = Math.max(0, ...leaks.map((at) => interpolate(t, [at - 0.1, at + 0.15, at + 0.8], [0, 0.9, 0], clamp)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 75% 60% at 50% 42%, transparent 55%, ${alpha("#000", vignette)} 100%)` }}
      />
      {leak > 0 && (
        <AbsoluteFill
          style={{
            opacity: leak,
            mixBlendMode: "screen",
            background: `radial-gradient(circle 700px at ${interpolate(leak, [0, 1], [-10, 70])}% 30%, ${alpha(theme.palette.accent, 0.85)}, ${alpha(theme.palette.accent, 0.25)} 45%, transparent 70%)`,
          }}
        />
      )}
      {grain > 0 && (
        <svg width={width} height={height} style={{ position: "absolute", opacity: grain, mixBlendMode: "overlay" }}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      )}
      {progress && (
        <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(frame / durationInFrames) * 100}%`, background: theme.palette.accent }} />
      )}
      {label && (
        <div
          style={{
            position: "absolute",
            top: 104,
            left: 72,
            fontFamily: theme.font.body,
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: 5,
            color: alpha(theme.palette.text, 0.8),
            textShadow: `0 2px 10px ${alpha("#000", 0.6)}`,
          }}
        >
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};
