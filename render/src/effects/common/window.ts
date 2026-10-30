import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, sec } from "../../theme/motion";

/** Local time of an overlay that lives from `at` for `seconds`, and its fade-out (1 → 0). */
export const useWindow = (at: number, seconds: number, fadeFrames = 8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = sec(at, fps);
  const end = sec(at + seconds, fps);
  return {
    visible: frame >= start && frame <= end,
    frame: frame - start,
    t: (frame - start) / fps,
    out: interpolate(frame, [end - fadeFrames, end], [1, 0], clamp),
    fps,
  };
};
