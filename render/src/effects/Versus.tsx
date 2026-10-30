import { interpolate, useVideoConfig } from "remotion";
import { z } from "zod";
import { formatNumber } from "../theme/format";
import { clamp, ease, pop } from "../theme/motion";
import { alpha, radiusPx, useTheme } from "../theme/theme";
import { DataCard, dataCardSchema } from "./common/DataCard";

// A vs B: two values side by side, a VS badge that lands, and a split bar that shows
// the share. The winner (higher value, or `winner`) takes the accent colour.
const side = z.object({ label: z.string(), value: z.number() });
export const versusSchema = dataCardSchema.extend({
  a: side,
  b: side,
  winner: z.enum(["a", "b", "none", "auto"]).default("auto"),
  decimals: z.number().int().min(0).max(3).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
});
export type VersusProps = z.input<typeof versusSchema>;

export const Versus: React.FC<VersusProps> = (props) => {
  const p = versusSchema.parse(props);
  const theme = useTheme();
  const { fps } = useVideoConfig();
  const { palette } = theme;
  const winner = p.winner === "auto" ? (p.a.value === p.b.value ? "none" : p.a.value > p.b.value ? "a" : "b") : p.winner;
  const total = Math.abs(p.a.value) + Math.abs(p.b.value) || 1;
  return (
    <DataCard {...p}>
      {(t) => {
        const k = interpolate(t, [0.3, 1.1], [0, 1], { ...clamp, easing: ease });
        const badge = pop(theme, Math.round(t * fps), Math.round(0.35 * fps), fps, -4);
        const share = 0.5 + (Math.abs(p.a.value) / total - 0.5) * k;
        const col = (s: "a" | "b") => (winner === s ? palette.accent : palette.text);
        const Side = ({ s }: { s: "a" | "b" }) => {
          const d = p[s];
          return (
            <div style={{ flex: 1, textAlign: s === "a" ? "left" : "right" }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: alpha(palette.text, 0.75) }}>{d.label}</div>
              <div
                style={{
                  fontFamily: theme.font.display,
                  fontWeight: 900,
                  fontSize: 96,
                  lineHeight: 1.05,
                  color: col(s),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {p.prefix}
                {formatNumber(d.value * k, p.locale, p.decimals)}
                {p.suffix}
              </div>
            </div>
          );
        };
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Side s="a" />
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: palette.accent,
                  color: palette.background,
                  fontFamily: theme.font.display,
                  fontWeight: 900,
                  fontSize: 42,
                  transform: `scale(${badge}) rotate(${interpolate(badge, [0, 1], [-30, 0])}deg)`,
                  flexShrink: 0,
                }}
              >
                VS
              </div>
              <Side s="b" />
            </div>
            <div style={{ display: "flex", height: 26, marginTop: 30, borderRadius: radiusPx(theme, 26), overflow: "hidden", gap: 6 }}>
              <div style={{ width: `${share * 100}%`, background: winner === "a" ? palette.accent : alpha(palette.muted, 0.55) }} />
              <div style={{ flex: 1, background: winner === "b" ? palette.accent : alpha(palette.muted, 0.55) }} />
            </div>
          </div>
        );
      }}
    </DataCard>
  );
};
