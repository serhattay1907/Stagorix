import { interpolate } from "remotion";
import { z } from "zod";
import { clamp, ease, pop } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";
import { DataCard, dataCardSchema } from "./common/DataCard";

// Events in order on a vertical line (reads top to bottom on a phone). The line draws
// down, each event pops in as the line reaches it; the highlighted one takes the accent.
export const timelineSchema = dataCardSchema.extend({
  events: z.array(z.object({ when: z.string(), what: z.string(), highlight: z.boolean().default(false) })).min(2).max(5),
  draw: z.number().positive().default(1.2).describe("Seconds for the line to reach the last event"),
});
export type TimelineProps = z.input<typeof timelineSchema>;

const ROW = 118;

export const Timeline: React.FC<TimelineProps> = (props) => {
  const p = timelineSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const n = p.events.length;
  return (
    <DataCard {...p}>
      {(t) => {
        const k = interpolate(t, [0.2, 0.2 + p.draw], [0, 1], { ...clamp, easing: ease });
        return (
          <div style={{ position: "relative", height: ROW * (n - 1) + 70 }}>
            <div style={{ position: "absolute", left: 24, top: 24, width: 6, height: ROW * (n - 1), background: alpha(palette.text, 0.12), borderRadius: 3 }} />
            <div style={{ position: "absolute", left: 24, top: 24, width: 6, height: ROW * (n - 1) * k, background: palette.accent, borderRadius: 3 }} />
            {p.events.map((e, i) => {
              const reach = n > 1 ? i / (n - 1) : 0;
              const at = 0.2 + p.draw * reach;
              const s = pop(theme, Math.round(t * 30), Math.round(at * 30), 30);
              const dot = e.highlight ? palette.accent : palette.text;
              return (
                <div key={i} style={{ position: "absolute", top: i * ROW, left: 0, right: 0, display: "flex", alignItems: "center", gap: 34, opacity: s }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      flexShrink: 0,
                      background: alpha(palette.surface, 1),
                      border: `6px solid ${dot}`,
                      transform: `scale(${s})`,
                      boxShadow: e.highlight ? `0 0 30px ${alpha(palette.accent, 0.6)}` : "none",
                    }}
                  />
                  <div style={{ transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)` }}>
                    <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, color: e.highlight ? palette.accent : palette.muted }}>{e.when}</div>
                    <div style={{ fontSize: 42, fontWeight: 700, color: palette.text, lineHeight: 1.15 }}>{e.what}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }}
    </DataCard>
  );
};
