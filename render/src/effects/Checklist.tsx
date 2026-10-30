import { interpolate } from "remotion";
import { z } from "zod";
import { clamp, ease, pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { DataCard, dataCardSchema } from "./common/DataCard";

// A list whose items appear and get ticked one by one ("3 things you need").
export const checklistSchema = dataCardSchema.extend({
  items: z.array(z.string()).min(2).max(6),
  step: z.number().positive().default(0.35).describe("Seconds between items"),
  checked: z.boolean().default(true).describe("Tick each item after it appears"),
});
export type ChecklistProps = z.input<typeof checklistSchema>;

export const Checklist: React.FC<ChecklistProps> = (props) => {
  const p = checklistSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  return (
    <DataCard {...p}>
      {(t) =>
        p.items.map((item, i) => {
          const at = 0.25 + i * p.step;
          const s = pop(theme, Math.round(t * 30), Math.round(at * 30), 30);
          const tick = p.checked ? interpolate(t, [at + 0.2, at + 0.45], [0, 1], { ...clamp, easing: ease }) : 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginTop: i ? 22 : 0,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-50, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  flexShrink: 0,
                  borderRadius: radiusPx(theme, 52),
                  border: `4px solid ${tick > 0 ? palette.accent : alpha(palette.text, 0.35)}`,
                  background: alpha(palette.accent, tick),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32">
                  <path
                    d="M6 17 L13 24 L26 9"
                    fill="none"
                    stroke={palette.background}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={32}
                    strokeDashoffset={32 * (1 - tick)}
                  />
                </svg>
              </div>
              <div style={{ fontSize: 44, fontWeight: 700, color: palette.text, lineHeight: 1.2 }}>{item}</div>
            </div>
          );
        })
      }
    </DataCard>
  );
};
