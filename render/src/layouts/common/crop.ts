/** Scale and offset that show a full 9:16 frame inside a box, kept on a focus point.
 *  The frame always covers the box (no empty edges); `zoom` > 1 crops tighter. */
export const cropToBox = (
  frame: { width: number; height: number },
  box: { width: number; height: number },
  focus: { x: number; y: number },
  anchor = { x: 0.5, y: 0.45 },
  zoom = 1,
) => {
  const scale = Math.max(box.width / frame.width, box.height / frame.height) * zoom;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const x = clamp(box.width * anchor.x - focus.x * scale, box.width - frame.width * scale, 0);
  const y = clamp(box.height * anchor.y - focus.y * scale, box.height - frame.height * scale, 0);
  return { scale, x, y };
};
