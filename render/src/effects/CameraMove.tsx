import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { amount, clamp, ease } from "../theme/motion";
import { useTheme } from "../theme/theme";

// Camera moves that treat the background and the speaker as separate depth layers (2D,
// no real 3D camera): wrap the background in <MoveLayer layer="background"> and the speaker
// in <MoveLayer layer="person">, with the same items.
//   orbit:       the camera arcs around the speaker (parallax + slight turn)
//   pullback:    starts tight on the face and pulls back to reveal the shot
//   zoomthrough: a fast push into the face that blurs into the next section (peak in the middle)
//   vertigo:     dolly zoom; the background stretches away while the speaker stays the same size
export const cameraMoveKind = z.enum(["orbit", "pullback", "zoomthrough", "vertigo"]);
export const cameraMoveSchema = z.object({
  items: z.array(z.object({ kind: cameraMoveKind, at: z.number(), seconds: z.number().positive() })).default([]),
  origin: z.object({ x: z.number(), y: z.number() }).default({ x: 540, y: 700 }).describe("Face position"),
});
export type CameraMoveProps = z.input<typeof cameraMoveSchema>;
type Item = z.infer<typeof cameraMoveSchema>["items"][number];
type Layer = "background" | "person";

/** The active move and its progress 0..1, or null. */
export const useCameraMove = (items: Item[]) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  for (const it of items) {
    if (t >= it.at && t <= it.at + it.seconds) return { kind: it.kind, p: (t - it.at) / it.seconds };
  }
  return null;
};

const style = (kind: Item["kind"], p: number, layer: Layer, k: (base: number) => number): React.CSSProperties => {
  const eased = ease(p);
  const bell = Math.sin(Math.PI * p);
  switch (kind) {
    case "orbit": {
      const swing = Math.sin((p - 0.5) * Math.PI); // -1 → 1
      return layer === "background"
        ? { transform: `translateX(${-k(110) * swing}px) scale(${1 + k(0.14)})` }
        : { transform: `translateX(${k(40) * swing}px) rotateY(${k(12) * swing}deg) scale(${1 + k(0.05)})` };
    }
    case "pullback": {
      const from = layer === "background" ? 1 + k(0.55) : 1 + k(0.4);
      return { transform: `scale(${interpolate(eased, [0, 1], [from, 1])})` };
    }
    case "zoomthrough": {
      const scale = 1 + k(layer === "background" ? 2.2 : 2.6) * bell ** 2;
      return { transform: `scale(${scale})`, filter: bell > 0.05 ? `blur(${k(20) * bell ** 2}px)` : undefined };
    }
    case "vertigo": {
      const s = layer === "background" ? 1 + k(0.35) * eased : 1 - k(0.03) * eased;
      return { transform: `scale(${s})` };
    }
  }
};

export const MoveLayer: React.FC<CameraMoveProps & { layer: Layer; children?: React.ReactNode }> = ({ layer, children, ...props }) => {
  const { items, origin } = cameraMoveSchema.parse(props);
  const theme = useTheme();
  const move = useCameraMove(items);
  const css = move ? style(move.kind, move.p, layer, (b) => amount(theme, b)) : {};
  return (
    <AbsoluteFill style={{ perspective: 1400 }}>
      <AbsoluteFill style={{ ...css, transformOrigin: `${origin.x}px ${origin.y}px` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Bright flash at the peak of a zoom-through, over everything. */
export const ZoomThroughFlash: React.FC<CameraMoveProps> = (props) => {
  const { items } = cameraMoveSchema.parse(props);
  const { palette } = useTheme();
  const move = useCameraMove(items);
  if (!move || move.kind !== "zoomthrough") return null;
  const o = interpolate(move.p, [0.4, 0.5, 0.62], [0, 0.85, 0], clamp);
  return <AbsoluteFill style={{ background: palette.text, opacity: o, pointerEvents: "none" }} />;
};
