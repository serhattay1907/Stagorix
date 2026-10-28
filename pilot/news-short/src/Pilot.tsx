import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { SCENES, FPS, TOTAL_SECONDS, SceneDef } from "./scenes";
import { T } from "./theme";
import { Captions, buildWords } from "./Captions";
import { HeadlineWall, ZoomBadge, Timeline, Spotlight, Checklist } from "./effects";

const Effect: React.FC<{ s: SceneDef; dur: number }> = ({ s, dur }) => {
  switch (s.effect) {
    case "headline_wall":
      return <HeadlineWall />;
    case "zoom_badge":
      return <ZoomBadge dur={dur} />;
    case "timeline":
      return <Timeline dur={dur} />;
    case "spotlight":
      return <Spotlight dur={dur} />;
    case "checklist":
      return <Checklist dur={dur} />;
  }
};

const SceneFade: React.FC<{ dur: number; children: React.ReactNode; first: boolean; last: boolean }> = ({ dur, children, first, last }) => {
  const f = useCurrentFrame();
  const fin = first ? 1 : interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fout = last ? 1 : interpolate(f, [dur - 8, dur], [1, 0], { extrapolateLeft: "clamp" });
  return <AbsoluteFill style={{ opacity: fin * fout }}>{children}</AbsoluteFill>;
};

const Chrome: React.FC = () => {
  const f = useCurrentFrame();
  const total = TOTAL_SECONDS * FPS;
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(f / total) * 100}%`, background: T.amber }} />
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 72,
          right: 150,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: T.font,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 4,
          color: T.muted,
        }}
      >
        <span>RANDOM TALKS ACADEMY</span>
        <span style={{ color: T.alert }}>● GÜNDEM</span>
      </div>
    </>
  );
};

export const Pilot: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      {SCENES.map((s, i) => {
        const from = Math.round(s.start * FPS);
        const dur = Math.round((s.end - s.start) * FPS);
        const words = buildWords(s.voice, 0, dur);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={s.id}>
            <SceneFade dur={dur} first={i === 0} last={i === SCENES.length - 1}>
              <Effect s={s} dur={dur} />
            </SceneFade>
            <Captions words={words} />
            {s.source && (
              <div style={{ position: "absolute", top: 1490, left: 72, right: 150, textAlign: "center", fontFamily: T.font, fontSize: 26, color: T.muted }}>
                {s.source}
              </div>
            )}
          </Sequence>
        );
      })}
      <Chrome />
    </AbsoluteFill>
  );
};
