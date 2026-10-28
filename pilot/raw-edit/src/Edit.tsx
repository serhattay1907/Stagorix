import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import words from "../public/words.json";
import { FACE, FPS, HOOK, HOOK_FRAMES, ITEMS, KEYWORDS, OUTRO, QUOTE, SFX, TRANSITION, VIDEO_END, s2f } from "./plan";

// Pilot tokens; in the real pipeline these come from brands/<slug>/tokens.json.
const C = {
  bg: "#0B0D10",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.72)",
  amber: "#FFC145",
  alert: "#FF4D3D",
  ok: "#3DDC97",
  font: "Inter, 'Noto Color Emoji', sans-serif",
};
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sp = (frame: number, at: number, fps: number, damping = 14, mass = 0.7) =>
  spring({ frame: frame - at, fps, config: { damping, mass } });

/* ---------- Camera: punch-in, jump zoom, whip transition ---------- */
const useCamera = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let scale = 1;
  let blur = 0;
  const t = f / FPS;
  if (t < HOOK.end) {
    scale = interpolate(t, [0, HOOK.end], [1.02, 1.16], { ...clamp, easing: ease });
    scale += 0.07 * sp(f, s2f(HOOK.line2At), fps, 9) * interpolate(t, [HOOK.line2At, HOOK.end], [1, 0.6], clamp);
  } else if (t < TRANSITION.at) {
    scale = interpolate(t, [HOOK.end, TRANSITION.at], [1.06, 1.12], clamp);
  } else {
    const idx = [...ITEMS].reverse().find((it) => t >= it.at);
    const base = idx ? (idx.n % 2 ? 1.0 : 1.14) : 1.0;
    const prev = idx && idx.n > 1 ? ((idx.n - 1) % 2 ? 1.0 : 1.14) : 1.12;
    const k = idx ? interpolate(f, [s2f(idx.at), s2f(idx.at) + 5], [0, 1], { ...clamp, easing: ease }) : 1;
    scale = prev + (base - prev) * k;
  }
  const w = interpolate(t, [TRANSITION.at, TRANSITION.at + TRANSITION.len / 2, TRANSITION.at + TRANSITION.len], [0, 1, 0], clamp);
  scale += w * 0.3;
  blur = w * 14;
  return { scale, blur };
};

const Camera: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { scale, blur } = useCamera();
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${FACE.x}px ${FACE.y}px`, filter: blur ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/* ---------- Hook: title behind the speaker ---------- */
const HookTitle: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(f, [s2f(HOOK.end) - 6, s2f(HOOK.end)], [1, 0], clamp);
  const line = (txt: string, at: number, color: string, top: number) => (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 0 }}>
      {txt.split("").map((ch, i) => {
        const s = sp(f, s2f(at) + i * 1.2, fps, 11, 0.6);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: C.font,
              fontWeight: 900,
              fontSize: 118,
              letterSpacing: -3,
              color,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [90, 0])}px) scale(${interpolate(s, [0, 1], [1.4, 1])})`,
              textShadow: "0 18px 50px rgba(0,0,0,0.45)",
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {line("ARTIK O KADAR", HOOK.line1At, C.text, 225)}
      {line("BASİT DEĞİL", HOOK.line2At, C.amber, 352)}
    </AbsoluteFill>
  );
};

const Cutout: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= HOOK_FRAMES) return null;
  return <Img src={staticFile(`cutout/${String(f).padStart(4, "0")}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />;
};

const Kicker: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = sp(f, 2, fps);
  const out = interpolate(f, [s2f(HOOK.kickerEnd) - 4, s2f(HOOK.kickerEnd) + 4], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s * out, transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})` }}>
      <div style={{ fontFamily: C.font, fontWeight: 800, fontSize: 64, color: C.text, background: "rgba(11,13,16,0.6)", padding: "16px 34px", borderRadius: 22, backdropFilter: "blur(12px)" }}>
        Ne yapması gerekiyor?
      </div>
    </div>
  );
};

/* ---------- Quote: "waiting to be given work" -> struck through ---------- */
const Bubble: React.FC<{ text: string; at: number; top: number; align: "left" | "right"; struck: number }> = ({ text, at, top, align, struck }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = sp(f, s2f(at), fps, 12);
  const typed = Math.floor(interpolate(f, [s2f(at) + 4, s2f(at) + 4 + text.length * 1.3], [0, text.length], clamp));
  return (
    <div style={{ position: "absolute", top, [align]: 110, transform: `scale(${s})`, transformOrigin: align === "left" ? "0% 100%" : "100% 100%" }}>
      <div
        style={{
          position: "relative",
          background: align === "left" ? "rgba(38,42,49,0.92)" : "rgba(255,255,255,0.95)",
          color: align === "left" ? C.text : C.bg,
          fontFamily: C.font,
          fontWeight: 700,
          fontSize: 54,
          padding: "26px 36px",
          borderRadius: 40,
          borderBottomLeftRadius: align === "left" ? 8 : 40,
          borderBottomRightRadius: align === "right" ? 8 : 40,
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          filter: `saturate(${1 - struck * 0.8}) brightness(${1 - struck * 0.25})`,
          minWidth: 120,
        }}
      >
        {text.slice(0, typed)}
        <span style={{ opacity: typed < text.length ? 1 : 0 }}>▍</span>
        <div style={{ position: "absolute", left: 24, top: "52%", height: 8, borderRadius: 4, background: C.alert, width: `calc(${struck * 100}% - ${struck * 48}px)` }} />
      </div>
    </div>
  );
};

const Quote: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const struck = interpolate(f, [s2f(QUOTE.strikeAt), s2f(QUOTE.strikeAt) + 12], [0, 1], { ...clamp, easing: ease });
  const stamp = sp(f, s2f(QUOTE.stampAt), fps, 10, 0.5);
  const out = interpolate(f, [s2f(QUOTE.end) - 6, s2f(QUOTE.end)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div style={{ position: "absolute", top: 180, left: 110, fontFamily: C.font, fontWeight: 700, fontSize: 34, color: C.muted, letterSpacing: 3, opacity: sp(f, s2f(QUOTE.start), fps) }}>
        BUGÜN ÇOĞU YAZILIMCI
      </div>
      <Bubble text="İş verilmesini bekliyorum…" at={QUOTE.bubble1At} top={235} align="left" struck={struck} />
      <Bubble text="İş yok 😩" at={QUOTE.bubble2At} top={370} align="right" struck={struck} />
      <div
        style={{
          position: "absolute",
          top: 395,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: stamp,
          transform: `rotate(-7deg) scale(${interpolate(stamp, [0, 1], [2.4, 1])})`,
        }}
      >
        <div style={{ border: `8px solid ${C.alert}`, color: C.alert, fontFamily: C.font, fontWeight: 900, fontSize: 76, padding: "8px 30px", borderRadius: 14, background: "rgba(11,13,16,0.55)", letterSpacing: 2 }}>
          BEKLEMEK YETMEZ
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Checklist card (glass) ---------- */
const Checklist: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  const cur = [...ITEMS].reverse().find((it) => t >= it.at);
  if (!cur || t >= OUTRO.start) return null;
  const enter = sp(f, s2f(ITEMS[0].at), fps, 15);
  const swap = sp(f, s2f(cur.at), fps, 13);
  const check = sp(f, s2f(cur.checkAt), fps, 10, 0.5);
  const doneCount = ITEMS.filter((it) => t >= it.checkAt).length;
  const exit = interpolate(t, [OUTRO.start - 0.25, OUTRO.start], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 64, right: 150, top: 1185, opacity: enter * exit, transform: `translateY(${interpolate(enter, [0, 1], [120, 0])}px)` }}>
      <div
        style={{
          background: "rgba(14,16,20,0.58)",
          backdropFilter: "blur(22px) saturate(1.4)",
          border: "2px solid rgba(255,255,255,0.14)",
          borderRadius: 34,
          padding: "26px 32px 30px",
          boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
          fontFamily: C.font,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 4, color: C.amber }}>KENDİNE SOR</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {ITEMS.map((it) => (
              <div
                key={it.n}
                style={{
                  width: it.n === cur.n ? 34 : 14,
                  height: 14,
                  borderRadius: 7,
                  background: t >= it.checkAt ? C.ok : it.n === cur.n ? C.text : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
            <div style={{ fontSize: 30, fontWeight: 800, color: C.text, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{String(cur.n).padStart(2, "0")}/07</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 22, height: 150 }}>
          <div
            style={{
              flex: "0 0 auto",
              width: 78,
              height: 78,
              borderRadius: 20,
              border: `5px solid ${check > 0.05 ? C.ok : "rgba(255,255,255,0.5)"}`,
              background: check > 0.05 ? C.ok : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${1 + 0.25 * Math.sin(Math.min(check, 1) * Math.PI)})`,
            }}
          >
            <svg width="46" height="46" viewBox="0 0 24 24">
              <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={C.bg} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset={30 * (1 - Math.min(check, 1))} />
            </svg>
          </div>
          <div key={cur.n} style={{ opacity: swap, transform: `translateY(${interpolate(swap, [0, 1], [50, 0])}px)`, lineHeight: 1.08 }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: C.muted }}>{cur.text}</div>
            <div style={{ fontSize: 66, fontWeight: 900, color: C.text, letterSpacing: -1.5 }}>{cur.key}</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(doneCount / ITEMS.length) * 100}%`, background: C.ok, borderRadius: 4 }} />
      </div>
    </div>
  );
};

/* ---------- Captions: word by word, keywords highlighted ---------- */
type W = { w: string; s: number; e: number };
const WORDS = (words as W[]).filter((w) => w.s >= HOOK.end - 0.05);
const CHUNKS: W[][] = (() => {
  const out: W[][] = [];
  let cl: W[] = [];
  const flush = () => {
    if (!cl.length) return;
    const n = Math.ceil(cl.length / 3);
    const size = Math.ceil(cl.length / n);
    for (let i = 0; i < cl.length; i += size) out.push(cl.slice(i, i + size));
    cl = [];
  };
  WORDS.forEach((w) => {
    cl.push(w);
    if (/[.,?!]$/.test(w.w)) flush();
  });
  flush();
  return out;
})();
const clean = (w: string) => w.toLocaleLowerCase("tr").replace(/[.,?!]/g, "");

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  if (t < HOOK.end || t > VIDEO_END) return null;
  const ch = CHUNKS.find((c, i) => t >= c[0].s - 0.05 && (i === CHUNKS.length - 1 || t < CHUNKS[i + 1][0].s - 0.05));
  if (!ch) return null;
  const pop = sp(f, s2f(ch[0].s - 0.05), fps, 13, 0.5);
  return (
    <div style={{ position: "absolute", top: 965, left: 64, right: 150, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 30px", transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`, opacity: pop }}>
      {ch.map((w, i) => {
        const active = t >= w.s && t < w.e + 0.08;
        const key = KEYWORDS.includes(clean(w.w));
        const said = t >= w.s;
        const s = sp(f, s2f(w.s), fps, 12, 0.4);
        return (
          <span
            key={i}
            style={{
              fontFamily: C.font,
              fontWeight: 900,
              fontSize: 76,
              letterSpacing: -1,
              color: key && said ? C.amber : said ? C.text : "rgba(255,255,255,0.55)",
              transform: `scale(${active ? 1 + 0.06 * s : 1})`,
              transformOrigin: "50% 80%",
              display: "inline-block",
              WebkitTextStroke: "2px rgba(0,0,0,0.55)",
              textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.6)",
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- Outro ---------- */
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / FPS;
  if (t < OUTRO.start) return null;
  const k = interpolate(t, [OUTRO.start, OUTRO.start + 0.6], [0, 1], { ...clamp, easing: ease });
  const card = sp(f, s2f(OUTRO.cardAt), fps, 13);
  const pills = ["Baştan sona kurmak", "Üretmek", "Bütünüyle yapmak", "Problem aşmak", "Ekip kurmak", "Konu bulmak", "Satış & geliştirme"];
  return (
    <AbsoluteFill>
      <Img src={staticFile("lastframe.jpg")} style={{ position: "absolute", width: 1080, height: 1920, transform: `scale(${1.0 + 0.12 * k})`, transformOrigin: `${FACE.x}px ${FACE.y}px`, filter: `blur(${18 * k}px) brightness(${1 - 0.5 * k})` }} />
      <div style={{ position: "absolute", top: 330, left: 72, right: 150, textAlign: "center", fontFamily: C.font, opacity: card, transform: `translateY(${interpolate(card, [0, 1], [60, 0])}px)` }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: C.muted }}>Dürüst ol:</div>
        <div style={{ fontSize: 112, fontWeight: 900, color: C.text, letterSpacing: -4, lineHeight: 1.02, marginTop: 6 }}>
          Kaçına <span style={{ color: C.ok }}>EVET</span>
          <br />
          diyebiliyorsun?
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 50 }}>
          {pills.map((p, i) => {
            const s = sp(f, s2f(OUTRO.cardAt) + 8 + i * 3, fps, 14);
            return (
              <div key={i} style={{ opacity: s, transform: `scale(${s})`, display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.08)", fontSize: 34, fontWeight: 700, color: C.text }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, border: "3px solid rgba(255,255,255,0.7)" }} />
                {p}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 60, fontSize: 52, fontWeight: 900, color: C.amber, opacity: sp(f, s2f(OUTRO.cardAt) + 35, fps) }}>Sayını yorumlara yaz 👇</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Overlays: vignette, light leak, grain, progress ---------- */
const Grade: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const leak = Math.max(
    interpolate(t, [TRANSITION.at - 0.05, TRANSITION.at + 0.15, TRANSITION.at + 0.6], [0, 1, 0], clamp),
    interpolate(t, [OUTRO.start - 0.1, OUTRO.start + 0.2, OUTRO.start + 1.2], [0, 0.9, 0], clamp),
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 42%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill
        style={{
          opacity: leak,
          mixBlendMode: "screen",
          background: `radial-gradient(circle 700px at ${interpolate(leak, [0, 1], [-10, 70])}% 30%, rgba(255,150,60,0.85), rgba(255,80,40,0.25) 45%, transparent 70%)`,
        }}
      />
      <svg width="1080" height="1920" style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, height: 10, width: `${(f / (25.5 * FPS)) * 100}%`, background: C.amber }} />
      <div style={{ position: "absolute", top: 104, left: 72, fontFamily: C.font, fontWeight: 800, fontSize: 26, letterSpacing: 5, color: "rgba(255,255,255,0.8)", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
        RANDOM TALKS ACADEMY
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Audio mix ---------- */
const AudioMix: React.FC = () => {
  const total = s2f(25.5);
  return (
    <>
      <Audio src={staticFile("voice.wav")} />
      <Audio
        src={staticFile("sfx/bed.wav")}
        volume={(f) => interpolate(f, [0, 15, s2f(OUTRO.start) - 10, s2f(OUTRO.start) + 10, total - 25, total], [0, 0.11, 0.11, 0.32, 0.32, 0], clamp)}
      />
      {SFX.map(([at, name, vol], i) => (
        <Sequence key={i} from={Math.max(0, s2f(at))} durationInFrames={s2f(2)}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </>
  );
};

export const Edit: React.FC = () => {
  const f = useCurrentFrame();
  const flash = interpolate(f / FPS, [TRANSITION.at + 0.1, TRANSITION.at + 0.16, TRANSITION.at + 0.26], [0, 0.7, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Camera>
        <OffthreadVideo src={staticFile("vertical.mp4")} muted style={{ width: 1080, height: 1920 }} />
      </Camera>
      <HookTitle />
      <Camera>
        <Cutout />
      </Camera>
      <Kicker />
      {f >= s2f(QUOTE.start) && f < s2f(QUOTE.end) && <Quote />}
      <Checklist />
      <Captions />
      <Outro />
      <Grade />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <AudioMix />
    </AbsoluteFill>
  );
};
