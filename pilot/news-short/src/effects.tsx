import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { T } from "./theme";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const appear = (frame: number, at: number, fps: number, damping = 13) =>
  spring({ frame: frame - at, fps, config: { damping, mass: 0.7 } });

const Chip: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = T.text,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 26px",
      borderRadius: 999,
      border: `2px solid ${color}`,
      color,
      fontFamily: T.font,
      fontWeight: 700,
      fontSize: 38,
      background: "rgba(11,13,16,0.75)",
      ...style,
    }}
  >
    {children}
  </div>
);

/* 1 — Headline wall: headline cards drop in, then a big hook number lands on top */
export const HeadlineWall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { t: "PHP'de kritik açık", r: -5, y: 300, c: T.text },
    { t: "CVSS 9.2", r: 4, y: 440, c: T.alert },
    { t: "Kurumlara acil uyarı", r: -3, y: 580, c: T.text },
    { t: "Yapay zekâ buldu", r: 5, y: 720, c: T.amber },
  ];
  const big = appear(frame, 48, fps, 11);
  return (
    <AbsoluteFill>
      {cards.map((c, i) => {
        const s = appear(frame, i * 7, fps);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 120 + (i % 2) * 60,
              top: interpolate(s, [0, 1], [c.y - 420, c.y]),
              transform: `rotate(${c.r * s}deg)`,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }) * interpolate(big, [0, 1], [1, 0.1]),
              filter: `blur(${interpolate(big, [0, 1], [0, 6])}px)`,
              background: T.surface,
              border: `2px solid ${T.line}`,
              borderLeft: `10px solid ${c.c}`,
              borderRadius: 18,
              padding: "28px 40px",
              fontFamily: T.font,
              fontWeight: 800,
              fontSize: 58,
              color: T.text,
              boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
            }}
          >
            {c.t}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 420,
          textAlign: "center",
          transform: `scale(${interpolate(big, [0, 1], [1.6, 1])})`,
          opacity: big,
          fontFamily: T.font,
        }}
      >
        <div style={{ fontSize: 300, fontWeight: 900, color: T.alert, lineHeight: 0.9, letterSpacing: -10 }}>14 YIL</div>
        <div style={{ fontSize: 56, fontWeight: 700, color: T.text, marginTop: 20 }}>fark edilmeden duran açık</div>
      </div>
    </AbsoluteFill>
  );
};

/* 2 — Digital zoom + badge */
export const ZoomBadge: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, dur], [1, 1.12], { easing: ease });
  const badge = appear(frame, 50, fps, 9);
  const rows = [
    { t: "Şifre / kimlik doğrulama gerekmez", at: 95 },
    { t: "Sunucuda uzaktan kod çalıştırma", at: 120 },
  ];
  const usom = appear(frame, 180, fps);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "50% 30%" }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 200 + i * 80, height: 2, background: T.line, opacity: 0.35 }} />
        ))}
        <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: T.font }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: T.muted, letterSpacing: 6 }}>ADI</div>
          <div style={{ fontSize: 170, fontWeight: 900, color: T.text, letterSpacing: -6, lineHeight: 1 }}>
            PHP<span style={{ color: T.alert }}>2</span>Shell
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${interpolate(badge, [0, 1], [0.4, 1])})`,
          opacity: badge,
        }}
      >
        <div style={{ background: T.alert, color: T.bg, fontFamily: T.font, fontWeight: 900, fontSize: 64, padding: "18px 44px", borderRadius: 20 }}>
          CVSS 9.2 · KRİTİK
        </div>
      </div>
      <div style={{ position: "absolute", top: 740, left: 110, right: 150, display: "flex", flexDirection: "column", gap: 26 }}>
        {rows.map((r, i) => {
          const s = appear(frame, r.at, fps);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`,
                fontFamily: T.font,
                fontWeight: 700,
                fontSize: 46,
                color: T.text,
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 11, background: T.alert }} />
              {r.t}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: usom, transform: `translateY(${interpolate(usom, [0, 1], [30, 0])}px)` }}>
        <Chip color={T.amber}>Siber Güvenlik Başkanlığı → acil uyarı</Chip>
      </div>
    </AbsoluteFill>
  );
};

/* 3 — Timeline: attack before the patch */
export const Timeline: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ai = appear(frame, 0, fps);
  const draw = interpolate(frame, [80, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const x0 = 150;
  const x1 = 900;
  const points = [
    { x: 0.08, d: "17 Eki", l: "İlk saldırı girişimi", c: T.alert, up: true },
    { x: 0.7, d: "20 Eki", l: "Açık sızdı", c: T.muted, up: false },
    { x: 0.95, d: "21 Eki", l: "Yama yayınlandı", c: T.ok, up: true },
  ];
  const gap = appear(frame, 210, fps, 10);
  const y = 760;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ai, transform: `scale(${interpolate(ai, [0, 1], [0.8, 1])})` }}>
        <Chip color={T.amber}>Araştırmacılar yapay zekâ kullandı</Chip>
      </div>
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, textAlign: "center", fontFamily: T.font, fontWeight: 900, fontSize: 84, color: T.text, opacity: appear(frame, 40, fps) }}>
        Ama saldırganlar <span style={{ color: T.alert }}>önde</span>
      </div>
      <div style={{ position: "absolute", left: x0, top: y, width: x1 - x0, height: 6, background: T.line, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: x0, top: y, width: (x1 - x0) * draw, height: 6, background: T.text, borderRadius: 3 }} />
      {points.map((p, i) => {
        const px = x0 + (x1 - x0) * p.x;
        const on = draw >= p.x - 0.02;
        const s = spring({ frame: on ? frame - (80 + p.x * 120) : -1, fps, config: { damping: 12 } });
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: px - 22,
                top: y - 19,
                width: 44,
                height: 44,
                borderRadius: 22,
                background: p.c,
                transform: `scale(${s})`,
                boxShadow: `0 0 0 10px ${p.c}33`,
              }}
            />
            <div style={{ position: "absolute", left: px - 200, width: 400, top: p.up ? y - 150 : y + 50, textAlign: "center", fontFamily: T.font, opacity: s }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: p.c }}>{p.d}</div>
              <div style={{ fontSize: 32, fontWeight: 600, color: T.text }}>{p.l}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 960, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: gap, transform: `translateY(${interpolate(gap, [0, 1], [30, 0])}px)` }}>
        <Chip color={T.alert}>Saldırı, yamadan 4 gün önce</Chip>
      </div>
    </AbsoluteFill>
  );
};

/* 4 — Spotlight: finding is fast, patching is slow */
export const Spotlight: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const find = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const patch = interpolate(frame, [60, dur], [0, 0.32], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focusY = interpolate(frame, [0, 90, 120], [520, 520, 760], { extrapolateRight: "clamp", easing: ease });
  const claude = appear(frame, 190, fps);
  const Row: React.FC<{ top: number; label: string; who: string; v: number; c: string }> = ({ top, label, who, v, c }) => (
    <div style={{ position: "absolute", top, left: 110, right: 150, fontFamily: T.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 76, fontWeight: 900, color: T.text, letterSpacing: -2 }}>{label}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: c }}>{who}</div>
      </div>
      <div style={{ marginTop: 18, height: 34, background: T.surface, border: `2px solid ${T.line}`, borderRadius: 17, overflow: "hidden" }}>
        <div style={{ width: `${v * 100}%`, height: "100%", background: c, borderRadius: 17 }} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 280, left: 0, right: 0, textAlign: "center", fontFamily: T.font, fontWeight: 800, fontSize: 52, color: T.muted, opacity: appear(frame, 0, fps) }}>
        Asıl mesele bu
      </div>
      <Row top={440} label="BULMAK" who="yapay zekâ" v={find} c={T.amber} />
      <Row top={680} label="YAMALAMAK" who="insanlar" v={patch} c={T.alert} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 620px 220px at 50% ${focusY}px, transparent 0%, rgba(11,13,16,0.0) 55%, rgba(11,13,16,0.72) 100%)`,
          opacity: interpolate(frame, [150, 185], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
      <div style={{ position: "absolute", top: 940, left: 110, right: 150, opacity: claude, transform: `translateY(${interpolate(claude, [0, 1], [40, 0])}px)` }}>
        <div style={{ background: T.surface, border: `2px solid ${T.line}`, borderRadius: 24, padding: "28px 34px", fontFamily: T.font }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: T.amber }}>GEÇEN HAFTA · CLAUDE</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: T.text, marginTop: 8, lineHeight: 1.2 }}>
            123 açık kaynak kütüphanede yıllardır fark edilmemiş hatalar
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 5 — Checklist + outro */
export const Checklist: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const versions = [
    ["PHP 8.2", "8.2.35"],
    ["PHP 8.3", "8.3.36"],
    ["PHP 8.4", "8.4.27"],
    ["PHP 8.5", "8.5.12"],
  ];
  const outroAt = 140;
  const out = interpolate(frame, [outroAt - 10, outroAt + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = appear(frame, outroAt, fps, 12);
  return (
    <AbsoluteFill>
      <div style={{ opacity: out }}>
        <div style={{ position: "absolute", top: 290, left: 110, right: 150, fontFamily: T.font }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: T.muted }}>Siten PHP mi?</div>
          <div style={{ fontSize: 96, fontWeight: 900, color: T.text, letterSpacing: -3, lineHeight: 1 }}>
            Bugün <span style={{ color: T.ok }}>güncelle</span>
          </div>
        </div>
        <div style={{ position: "absolute", top: 560, left: 110, right: 150, display: "flex", flexDirection: "column", gap: 22 }}>
          {versions.map(([from, to], i) => {
            const s = appear(frame, 15 + i * 14, fps);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: T.surface,
                  border: `2px solid ${T.line}`,
                  borderRadius: 20,
                  padding: "22px 30px",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [80, 0])}px)`,
                  fontFamily: T.font,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: T.ok, color: T.bg, fontSize: 38, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})` }}>
                    ✓
                  </div>
                  <div style={{ fontSize: 44, fontWeight: 700, color: T.muted }}>{from}</div>
                </div>
                <div style={{ fontSize: 50, fontWeight: 900, color: T.text }}>→ {to}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", fontFamily: T.font, opacity: outro, transform: `scale(${interpolate(outro, [0, 1], [0.85, 1])})` }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: T.muted }}>Yeni yarışın kuralı</div>
        <div style={{ fontSize: 132, fontWeight: 900, color: T.text, letterSpacing: -4, lineHeight: 1.05, marginTop: 10 }}>
          İlk kim
          <br />
          <span style={{ color: T.amber }}>bulursa.</span>
        </div>
        <div style={{ marginTop: 70, display: "flex", justifyContent: "center" }}>
          <Chip color={T.text} style={{ fontSize: 34 }}>
            Random Talks Academy · Takip et
          </Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};
