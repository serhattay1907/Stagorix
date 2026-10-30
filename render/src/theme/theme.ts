import { zColor } from "@remotion/zod-types";
import { createContext, useContext } from "react";
import { z } from "zod";
import { FONTS } from "./fonts";
import { positionSchema } from "./layout";

export const captionStyleSchema = z.enum(["highlight", "karaoke", "boxed", "pop", "bold", "reveal", "marker", "plain"]);
export type CaptionStyle = z.infer<typeof captionStyleSchema>;

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
    style: captionStyleSchema,
    case: z.enum(["as-is", "upper"]),
    position: positionSchema,
  }),
  sound: z
    .object({ volume: z.number().min(0).max(1).describe("Sound effects level: 0 off … 1 full") })
    .default({ volume: 0.7 }),
});

export type Theme = z.infer<typeof themeSchema>;

// Brand-free default: high-contrast and readable on any footage, not a brand look.
export const neutralTheme: Theme = {
  palette: {
    background: "#0A0B0F",
    surface: "#16181F",
    text: "#FFFFFF",
    muted: "#C3C7D1",
    accent: "#FFD23F",
    positive: "#2EE6A6",
    negative: "#FF5470",
  },
  font: { display: FONTS.montserrat, body: FONTS.inter },
  radius: 2,
  energy: 3,
  captions: { style: "highlight", case: "as-is", position: "middle" },
  sound: { volume: 0.7 },
};

const ThemeContext = createContext<Theme>(neutralTheme);
export const ThemeProvider = ThemeContext.Provider;
export const useTheme = () => useContext(ThemeContext);

/** Color with transparency, for any CSS color the palette holds. */
export const alpha = (color: string, a: number) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

/** Corner radius in px for an element of the given height. */
export const radiusPx = (theme: Theme, height: number) => [0, 0.12, 0.25, 0.4, 0.5][theme.radius] * height;
