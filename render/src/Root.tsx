import { Composition } from "remotion";
import { Placeholder, placeholderSchema } from "./compositions/Placeholder";

// Vertical 9:16 at 30 fps, shared by YouTube Shorts and Instagram Reels.
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

export const Root: React.FC = () => (
  <Composition
    id="Placeholder"
    component={Placeholder}
    schema={placeholderSchema}
    defaultProps={{ title: "Stagorix", background: "#111111", foreground: "#ffffff" }}
    durationInFrames={VIDEO.fps * 3}
    {...VIDEO}
  />
);
