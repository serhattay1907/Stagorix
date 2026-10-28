// Edit plan (EDL): hand-written version of the JSON the Editor agent will produce.
// Timings are locked to the Whisper word timestamps of the test video.
export const FPS = 30;
export const VIDEO_END = 22.38; // end of the raw video
export const TOTAL = 25.5;
export const FACE = { x: 540, y: 759 };
export const HOOK_FRAMES = 102;

export const s2f = (s: number) => Math.round(s * FPS);

export const HOOK = { kickerEnd: 1.3, line1At: 1.32, line2At: 2.28, end: 3.08 };

export const QUOTE = {
  start: 3.08,
  bubble1At: 3.3,
  bubble2At: 4.36,
  strikeAt: 6.1,
  stampAt: 6.68,
  end: 7.7,
};

export const TRANSITION = { at: 7.62, len: 0.32 };

export type Item = { n: number; text: string; key: string; at: number; checkAt: number };
export const ITEMS: Item[] = [
  { n: 1, text: "Bir işi baştan sona", key: "kendin kurmak", at: 7.86, checkAt: 10.3 },
  { n: 2, text: "Gerçekten ne", key: "üretebiliyorsun?", at: 10.44, checkAt: 11.7 },
  { n: 3, text: "İşi", key: "bütünüyle yapmak", at: 11.92, checkAt: 13.1 },
  { n: 4, text: "Bütün", key: "problemleri aşmak", at: 13.36, checkAt: 14.9 },
  { n: 5, text: "Bir", key: "ekip kurmak", at: 15.24, checkAt: 16.4 },
  { n: 6, text: "Doğru", key: "konuyu bulmak", at: 16.82, checkAt: 18.1 },
  { n: 7, text: "Ürünün", key: "satış & geliştirmesi", at: 18.42, checkAt: 21.9 },
];

export const OUTRO = { start: 22.3, cardAt: 22.55 };

export const KEYWORDS = [
  "basit",
  "bekliyorum",
  "yok",
  "bekliyorsun",
  "kendin",
  "üretebiliyorsun",
  "bütünüyle",
  "problemleri",
  "ekip",
  "konu",
  "satışını",
  "geliştirmesini",
];

// Sound effect timeline: [seconds, file, volume]
export const SFX: [number, string, number][] = [
  [0.0, "whoosh", 0.35],
  [1.22, "whip", 0.55],
  [2.26, "impact", 0.8],
  [QUOTE.bubble1At, "pop", 0.45],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [3.42 + i * 0.07, "tick", 0.35] as [number, string, number]),
  [QUOTE.bubble2At, "pop", 0.45],
  [QUOTE.stampAt - 0.04, "buzz", 0.55],
  [QUOTE.stampAt, "impact", 0.45],
  [TRANSITION.at - 0.05, "whoosh", 0.7],
  ...ITEMS.map((it) => [it.at - 0.04, "whip", 0.22] as [number, string, number]),
  ...ITEMS.map((it) => [it.checkAt, "pop", 0.55] as [number, string, number]),
  [20.9, "riser", 0.5],
  [OUTRO.start + 0.15, "impact", 0.75],
  [OUTRO.cardAt + 0.6, "ding", 0.4],
];
