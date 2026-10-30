import { FONTS } from "./fonts";
import LOOK_DATA from "./looks.json";
import { type Theme, themeSchema } from "./theme";

// Ready-made looks (style packs). The data lives in looks.json so the Python side
// (CLI, brand wizard) reads the same list. A brand starts from a look and changes any value.
type LookData = (typeof LOOK_DATA)[keyof typeof LOOK_DATA];
export type LookId = keyof typeof LOOK_DATA;

const toTheme = (look: LookData): Theme =>
  themeSchema.parse({
    palette: look.palette,
    font: { display: FONTS[look.font.display as keyof typeof FONTS], body: FONTS[look.font.body as keyof typeof FONTS] },
    radius: look.radius,
    energy: look.energy,
    captions: look.captions,
  });

export const LOOKS = Object.fromEntries(
  Object.entries(LOOK_DATA).map(([id, look]) => [id, { name: look.name, description: look.description, theme: toTheme(look) }]),
) as Record<LookId, { name: string; description: string; theme: Theme }>;

export const LOOK_IDS = Object.keys(LOOK_DATA) as LookId[];
