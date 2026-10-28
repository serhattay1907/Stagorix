import React from "react";
import { Composition } from "remotion";
import { Pilot } from "./Pilot";
import { FPS, TOTAL_SECONDS } from "./scenes";

export const Root: React.FC = () => (
  <Composition id="Pilot" component={Pilot} durationInFrames={Math.round(TOTAL_SECONDS * FPS)} fps={FPS} width={1080} height={1920} />
);
