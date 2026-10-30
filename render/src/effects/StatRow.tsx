import { interpolate } from "remotion";
import { z } from "zod";
import { formatNumber } from "../theme/format";
import { clamp, ease } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";
import { DataCard, dataCardSchema } from "./common/DataCard";

// Two or three key numbers in a row, counting up one after another ("3 tools · 2 h · $0").
export const statRowSchema = dataCardSchema.extend({
  stats: z
    .array(
      z.object({
        value: z.number(),
        label: z.string(),
        decimals: z.number().int().min(0).max(3).default(0),
        prefix: z.string().default(""),
        suffix: z.string().default(""),
      }),
    )
    .min(2)
    .max(3),
});
export type StatRowProps = z.input<typeof statRowSchema>;

const STAGGER = 0.25;

export const StatRow: React.FC<StatRowProps> = (props) => {
  const p = statRowSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  return (
    <DataCard {...p}>
      {(t) => (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          {p.stats.map((s, i) => {
            const k = interpolate(t, [0.2 + i * STAGGER, 0.9 + i * STAGGER], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={i} style={{ flex: 1, textAlign: "center", opacity: interpolate(k, [0, 0.2], [0, 1], clamp) }}>
                <div
                  style={{
                    fontFamily: theme.font.display,
                    fontWeight: 900,
                    fontSize: 84,
                    lineHeight: 1,
                    color: i === 0 ? palette.accent : palette.text,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.prefix}
                  {formatNumber(s.value * k, p.locale, s.decimals)}
                  {s.suffix}
                </div>
                <div style={{ marginTop: 12, fontSize: 30, fontWeight: 700, color: alpha(palette.text, 0.7) }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </DataCard>
  );
};
