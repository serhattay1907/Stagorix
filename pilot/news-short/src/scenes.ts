// Hand-written version of the scene JSON the Writer agent will produce later.
export const FPS = 30;

export type SceneDef = {
  id: string;
  start: number; // seconds
  end: number;
  effect: "headline_wall" | "zoom_badge" | "timeline" | "spotlight" | "checklist";
  voice: string; // caption (voice-over text)
  source?: string;
};

export const SCENES: SceneDef[] = [
  {
    id: "hook",
    start: 0,
    end: 3.5,
    effect: "headline_wall",
    voice: "İnternette 14 yıldır duran bir açığı yapay zekâ buldu. Ama asıl kötü haber bu değil.",
  },
  {
    id: "what",
    start: 3.5,
    end: 12.5,
    effect: "zoom_badge",
    voice:
      "Adı PHP2Shell. PHP'deki iki kritik açık, saldırganın şifre bile girmeden sunucuda kod çalıştırmasına izin veriyor. Türkiye'de Siber Güvenlik Başkanlığı kurumlara acil uyarı gönderdi.",
    source: "Kaynak: Tenable · Bloomberg HT",
  },
  {
    id: "race",
    start: 12.5,
    end: 22,
    effect: "timeline",
    voice:
      "Açığı bulan araştırmacılar yapay zekâ modelleri kullandı. Ama saldırganlar daha hızlıydı: ilk saldırı girişimi, açık duyurulmadan günler önce görüldü.",
    source: "Kaynak: Tenable · Amazon Threat Intelligence",
  },
  {
    id: "point",
    start: 22,
    end: 32,
    effect: "spotlight",
    voice:
      "Asıl mesele bu. Yapay zekâ açık bulmayı hızlandırıyor ama yamaları hâlâ insanlar yetiştiriyor. Geçen hafta Claude da 123 açık kaynak kütüphanede yıllardır fark edilmemiş hatalar buldu.",
    source: "Kaynak: The Neuron, 23 Ekim 2026",
  },
  {
    id: "action",
    start: 32,
    end: 40,
    effect: "checklist",
    voice: "Siten PHP kullanıyorsa bugün güncelle. Yeni yarışın kuralı basit: açığı ilk kim bulursa.",
    source: "Yamalı sürümler: php.net",
  },
];

export const TOTAL_SECONDS = SCENES[SCENES.length - 1].end;
