import { Composition } from "remotion";
import { Placeholder, placeholderSchema } from "./compositions/Placeholder";
import { SHOWCASE_SECONDS, Showcase, showcaseSchema } from "./compositions/Showcase";
import { neutralTheme } from "./theme/theme";

// Vertical 9:16 at 30 fps, shared by YouTube Shorts and Instagram Reels.
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

export const Root: React.FC = () => (
  <>
    <Composition
      id="Placeholder"
      component={Placeholder}
      schema={placeholderSchema}
      defaultProps={{ title: "Stagorix", background: "#111111", foreground: "#ffffff" }}
      durationInFrames={VIDEO.fps * 3}
      {...VIDEO}
    />
    <Composition
      id="Showcase"
      component={Showcase}
      schema={showcaseSchema}
      defaultProps={{ theme: neutralTheme, footage: "", cutoutFrames: 0, cutoutDir: "showcase-input/cutout" }}
      durationInFrames={VIDEO.fps * SHOWCASE_SECONDS}
      {...VIDEO}
    />
  </>
);
