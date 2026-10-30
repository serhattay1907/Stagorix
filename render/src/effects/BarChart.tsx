import { interpolate } from "remotion";
import { z } from "zod";
import { formatNumber } from "../theme/format";
import { clamp, ease } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { DataCard, dataCardSchema } from "./parts/DataCard";

// Ranked horizontal bars (readable on a phone, labels never rotate). Bars grow one after
// another, values count up, and the highlighted item takes the accent colour.
export const barChartSchema = dataCardSchema.extend({
  items: z.array(z.object({ label: z.string(), value: z.number() })).min(2).max(6),
  highlight: z.string().default("").describe("Label of the item in the accent colour"),
  decimals: z.number().int().min(0).max(3).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
});
export type BarChartProps = z.input<typeof barChartSchema>;

const STAGGER = 0.12;
const GROW = 0.7;

export const BarChart: React.FC<BarChartProps> = (props) => {
  const p = barChartSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const max = Math.max(...p.items.map((i) => Math.abs(i.value)), 1e-9);
  return (
    <DataCard {...p}>
      {(t) =>
        p.items.map((item, i) => {
          const k = interpolate(t, [0.2 + i * STAGGER, 0.2 + i * STAGGER + GROW], [0, 1], { ...clamp, easing: ease });
          const hot = item.label === p.highlight;
          const fill = hot ? palette.accent : alpha(palette.muted, 0.55);
          return (
            <div key={i} style={{ marginTop: i ? 22 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ color: hot ? palette.text : alpha(palette.text, 0.8) }}>{item.label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: hot ? palette.accent : palette.text, fontWeight: 800 }}>
                  {p.prefix}
                  {formatNumber(item.value * k, p.locale, p.decimals)}
                  {p.suffix}
                </span>
              </div>
              <div style={{ height: 30, borderRadius: radiusPx(theme, 30), background: alpha(palette.text, 0.08), overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(Math.abs(item.value) / max) * 100 * k}%`,
                    height: "100%",
                    borderRadius: radiusPx(theme, 30),
                    background: fill,
                  }}
                />
              </div>
            </div>
          );
        })
      }
    </DataCard>
  );
};
