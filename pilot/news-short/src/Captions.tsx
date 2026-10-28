import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { T } from "./theme";

type Word = { text: string; start: number; end: number; chunk: number };

// Without audio, word timings are spread by character length.
// In the real pipeline these timings come from Whisper.
export const buildWords = (text: string, startF: number, endF: number): Word[] => {
  const tokens = text.split(/\s+/).filter(Boolean);
  const pad = 6;
  const span = endF - startF - pad * 2;
  const weights = tokens.map((t) => Math.max(3, t.length) + (/[.,:!?]$/.test(t) ? 4 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  // Split into clauses at punctuation, then each clause into balanced chunks of <= 4 words.
  const chunkOf: number[] = [];
  let clause: number[] = [];
  let chunk = 0;
  const flush = () => {
    const n = Math.ceil(clause.length / 4);
    const size = Math.ceil(clause.length / n);
    clause.forEach((idx, k) => (chunkOf[idx] = chunk + Math.floor(k / size)));
    chunk += n;
    clause = [];
  };
  tokens.forEach((t, i) => {
    clause.push(i);
    if (/[.,:!?]$/.test(t)) flush();
  });
  if (clause.length) flush();

  let cursor = startF + pad;
  return tokens.map((t, i) => {
    const d = (weights[i] / total) * span;
    const w: Word = { text: t, start: cursor, end: cursor + d, chunk: chunkOf[i] };
    cursor += d;
    return w;
  });
};

export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = words.find((w) => frame >= w.start && frame < w.end) ?? words.filter((w) => frame >= w.start).pop();
  if (!active) return null;
  const chunkWords = words.filter((w) => w.chunk === active.chunk);
  const chunkStart = chunkWords[0].start;
  const pop = spring({ frame: frame - chunkStart, fps, config: { damping: 14, mass: 0.6 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 150,
        top: 1240,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 18px",
        transform: `translateY(${interpolate(pop, [0, 1], [24, 0])}px)`,
        opacity: pop,
      }}
    >
      {chunkWords.map((w, i) => {
        const on = frame >= w.start;
        const current = w === active;
        return (
          <span
            key={i}
            style={{
              fontFamily: T.font,
              fontWeight: 800,
              fontSize: 66,
              lineHeight: 1.15,
              color: current ? T.bg : on ? T.text : "rgba(244,241,234,0.45)",
              background: current ? T.amber : "transparent",
              padding: "2px 12px",
              borderRadius: 12,
              textShadow: current ? "none" : "0 4px 18px rgba(0,0,0,0.6)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
