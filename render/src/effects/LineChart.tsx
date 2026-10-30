import { interpolate } from "remotion";
import { z } from "zod";
import { formatNumber } from "../theme/format";
import { clamp, ease } from "../theme/motion";
import { alpha, useTheme } from "../theme/theme";
import { DataCard, dataCardSchema } from "./parts/DataCard";

// A trend that draws itself left to right; the last value is called out at the end of
// the line. For "it went up/down" moments, not for reading exact values.
export const lineChartSchema = dataCardSchema.extend({
  points: z.array(z.number()).min(2).max(24),
  from: z.string().default("").describe("Label under the first point, e.g. 2020"),
  to: z.string().default("").describe("Label under the last point, e.g. 2026"),
  decimals: z.number().int().min(0).max(3).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
});
export type LineChartProps = z.input<typeof lineChartSchema>;

const W = 780;
const H = 360;
const DRAW = 1.2;

export const LineChart: React.FC<LineChartProps> = (props) => {
  const p = lineChartSchema.parse(props);
  const theme = useTheme();
  const { palette } = theme;
  const lo = Math.min(...p.points);
  const hi = Math.max(...p.points);
  const pad = (hi - lo || 1) * 0.12;
  const xy = p.points.map((v, i) => [(i / (p.points.length - 1)) * W, H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H] as const);
  const path = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const length = xy.reduce((s, [x, y], i) => (i ? s + Math.hypot(x - xy[i - 1][0], y - xy[i - 1][1]) : 0), 0);
  return (
    <DataCard {...p}>
      {(t) => {
        const k = interpolate(t, [0.25, 0.25 + DRAW], [0, 1], { ...clamp, easing: ease });
        const land = interpolate(t, [0.25 + DRAW - 0.1, 0.25 + DRAW + 0.25], [0, 1], clamp);
        const [ex, ey] = xy[xy.length - 1];
        const last = p.points[p.points.length - 1];
        const id = `line-fill-${p.at}`;
        return (
          <div>
            <svg width="100%" viewBox={`-20 -60 ${W + 40} ${H + 80}`} style={{ overflow: "visible", display: "block" }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                </linearGradient>
                <clipPath id={`${id}-clip`}>
                  <rect x={-20} y={-60} width={(W + 40) * k} height={H + 80} />
                </clipPath>
              </defs>
              {[0.25, 0.5, 0.75].map((g) => (
                <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke={alpha(palette.text, 0.08)} strokeWidth={2} />
              ))}
              <path d={`${path} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} clipPath={`url(#${id}-clip)`} />
              <path
                d={path}
                fill="none"
                stroke={palette.accent}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={length}
                strokeDashoffset={length * (1 - k)}
              />
              <circle cx={ex} cy={ey} r={18 * land} fill={palette.accent} />
              <circle cx={ex} cy={ey} r={18 + 26 * land} fill="none" stroke={palette.accent} strokeOpacity={0.4 * (1 - land)} strokeWidth={4} />
              <text
                x={ex}
                y={ey - 40}
                textAnchor="end"
                opacity={land}
                fill={palette.text}
                style={{ fontFamily: theme.font.display, fontWeight: 900, fontSize: 64 }}
              >
                {p.prefix}
                {formatNumber(last, p.locale, p.decimals)}
                {p.suffix}
              </text>
            </svg>
            {(p.from || p.to) && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 30, fontWeight: 700, color: alpha(palette.text, 0.65) }}>
                <span>{p.from}</span>
                <span>{p.to}</span>
              </div>
            )}
          </div>
        );
      }}
    </DataCard>
  );
};
