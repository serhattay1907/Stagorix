import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { clamp, ease, pop, sec } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";

// Closing card over a blurred last frame: question, optional checklist pills, call to action.
export const outroSchema = z.object({
  from: z.number(),
  heading: z.string().default(""),
  title: z.string(),
  highlight: z.string().default("").describe("Part of the title shown in the accent color"),
  items: z.array(z.string()).default([]),
  cta: z.string().default(""),
  backdrop: z.string().default("").describe("Image in public/ to blur behind the card"),
  origin: z.object({ x: z.number(), y: z.number() }).default({ x: 540, y: 700 }),
});
export type OutroProps = z.input<typeof outroSchema>;

export const Outro: React.FC<OutroProps> = (props) => {
  const { from, heading, title, highlight, items, cta, backdrop, origin } = outroSchema.parse(props);
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const start = sec(from, fps);
  if (frame < start) return null;
  const k = interpolate(frame, [start, start + sec(0.6, fps)], [0, 1], { ...clamp, easing: ease });
  const card = pop(theme, frame, start + 6, fps);
  const { palette } = theme;
  const parts = highlight && title.includes(highlight) ? title.split(highlight) : [title];
  return (
    <AbsoluteFill>
      {backdrop ? (
        <Img
          src={staticFile(backdrop)}
          style={{
            position: "absolute",
            width,
            height,
            transform: `scale(${1 + 0.12 * k})`,
            transformOrigin: `${origin.x}px ${origin.y}px`,
            filter: `blur(${18 * k}px) brightness(${1 - 0.5 * k})`,
          }}
        />
      ) : (
        <AbsoluteFill style={{ background: alpha(palette.background, 0.6 * k), backdropFilter: `blur(${18 * k}px)` }} />
      )}
      <div
        style={{
          position: "absolute",
          top: height * 0.17,
          left: 72,
          right: 150,
          textAlign: "center",
          fontFamily: theme.font.display,
          opacity: card,
          transform: `translateY(${interpolate(card, [0, 1], [60, 0])}px)`,
        }}
      >
        {heading && <div style={{ fontSize: 60, fontWeight: 800, color: palette.muted }}>{heading}</div>}
        <div style={{ fontSize: 104, fontWeight: 900, color: palette.text, letterSpacing: -3, lineHeight: 1.04, marginTop: 6 }}>
          {parts.length === 2 ? (
            <>
              {parts[0]}
              <span style={{ color: palette.accent }}>{highlight}</span>
              {parts[1]}
            </>
          ) : (
            title
          )}
        </div>
        {items.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 50 }}>
            {items.map((item, i) => {
              const s = pop(theme, frame, start + 14 + i * 3, fps);
              return (
                <div
                  key={i}
                  style={{
                    opacity: s,
                    transform: `scale(${s})`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 22px",
                    borderRadius: radiusPx(theme, 70),
                    border: `2px solid ${alpha(palette.text, 0.35)}`,
                    background: alpha(palette.text, 0.08),
                    fontFamily: theme.font.body,
                    fontSize: 34,
                    fontWeight: 700,
                    color: palette.text,
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: radiusPx(theme, 26), border: `3px solid ${alpha(palette.text, 0.7)}` }} />
                  {item}
                </div>
              );
            })}
          </div>
        )}
        {cta && (
          <div style={{ marginTop: 60, fontSize: 52, fontWeight: 900, color: palette.accent, opacity: pop(theme, frame, start + 40, fps) }}>
            {cta}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
