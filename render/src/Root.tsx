import { Composition } from "remotion";
import { Placeholder, placeholderSchema } from "./compositions/Placeholder";
import { LAYOUT_REEL_SECONDS, LayoutReel, layoutReelSchema } from "./compositions/LayoutReel";
import { LOOK_REEL_SECONDS, LookReel } from "./compositions/LookReel";
import { SHOWCASE_SECONDS, Showcase, showcaseSchema } from "./compositions/Showcase";
import { SoundReel, soundReelMetadata, soundReelSchema } from "./compositions/SoundReel";
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
      defaultProps={{ theme: neutralTheme, look: "", footage: "", cutoutFrames: 0, cutoutDir: "showcase-input/cutout", matteDir: "", matteFrames: 0, matteFps: 30, sounds: [] }}
      durationInFrames={VIDEO.fps * SHOWCASE_SECONDS}
      {...VIDEO}
    />
    <Composition
      id="LookReel"
      component={LookReel}
      durationInFrames={Math.round(VIDEO.fps * LOOK_REEL_SECONDS)}
      {...VIDEO}
    />
    <Composition
      id="LayoutReel"
      component={LayoutReel}
      schema={layoutReelSchema}
      defaultProps={{ theme: neutralTheme, look: "", footage: "", focus: { x: 540, y: 700 }, matteDir: "", matteFrames: 0, matteFps: 30 }}
      durationInFrames={Math.round(VIDEO.fps * LAYOUT_REEL_SECONDS)}
      {...VIDEO}
    />
    <Composition
      id="SoundReel"
      component={SoundReel}
      schema={soundReelSchema}
      defaultProps={{ sounds: ["whoosh-fast", "impact-punch", "pop-bubble", "chime-success"] }}
      calculateMetadata={soundReelMetadata}
      durationInFrames={1}
      {...VIDEO}
    />
  </>
);
