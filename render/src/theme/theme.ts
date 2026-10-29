import { zColor } from "@remotion/zod-types";
import { createContext, useContext } from "react";
import { z } from "zod";

// A theme is a set of choices on fixed scales, so a brand (or the setup wizard)
// picks values instead of writing CSS. Brand profiles (phase 4) provide one;
// effects never hard-code a color, font or motion amount (principle 1).
export const themeSchema = z.object({
  palette: z.object({
    background: zColor(),
    surface: zColor(),
    text: zColor(),
    muted: zColor(),
    accent: zColor(),
    positive: zColor(),
    negative: zColor(),
  }),
  font: z.object({
    display: z.string().describe("Headlines and captions"),
    body: z.string().describe("Labels and small text"),
  }),
  radius: z.number().int().min(0).max(4).describe("Corner roundness: 0 square … 4 pill"),
  energy: z.number().int().min(1).max(5).describe("Motion: 1 calm … 5 punchy"),
  captions: z.object({
    style: z.enum(["highlight", "karaoke", "plain"]),
    case: z.enum(["as-is", "upper"]),
    position: z.enum(["middle", "lower"]),
  }),
});

export type Theme = z.infer<typeof themeSchema>;

// Deliberately plain: no brand look, readable on any footage.
export const neutralTheme: Theme = {
  palette: {
    background: "#0E0F12",
    surface: "#1B1D22",
    text: "#FFFFFF",
    muted: "#B9BDC6",
    accent: "#5B8CFF",
    positive: "#3DD68C",
    negative: "#FF5A4E",
  },
  font: { display: "'Noto Sans', 'Noto Color Emoji', sans-serif", body: "'Noto Sans', 'Noto Color Emoji', sans-serif" },
  radius: 2,
  energy: 3,
  captions: { style: "highlight", case: "as-is", position: "middle" },
};

const ThemeContext = createContext<Theme>(neutralTheme);
export const ThemeProvider = ThemeContext.Provider;
export const useTheme = () => useContext(ThemeContext);

/** Color with transparency, for any CSS color the palette holds. */
export const alpha = (color: string, a: number) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

/** Corner radius in px for an element of the given height. */
export const radiusPx = (theme: Theme, height: number) => [0, 0.12, 0.25, 0.4, 0.5][theme.radius] * height;
