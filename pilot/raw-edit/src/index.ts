import React from "react";
import { Composition, registerRoot } from "remotion";
import { Edit } from "./Edit";
import { FPS, TOTAL } from "./plan";

const Root: React.FC = () =>
  React.createElement(Composition, {
    id: "Edit",
    component: Edit,
    durationInFrames: Math.round(TOTAL * FPS),
    fps: FPS,
    width: 1080,
    height: 1920,
  });

registerRoot(Root);
