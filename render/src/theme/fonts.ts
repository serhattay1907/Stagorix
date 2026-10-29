// Bundled fonts: SIL Open Font License 1.1 (via Fontsource), Latin + Latin Extended,
// so every OS renders the same letters. Other scripts fall back to Noto in the image.
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/bebas-neue/latin-ext-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-700.css";
import "@fontsource/inter/latin-ext-800.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-ext-800.css";
import "@fontsource/montserrat/latin-ext-900.css";
import { cancelRender, continueRender, delayRender } from "remotion";

const FALLBACK = "'Noto Sans', 'Noto Color Emoji', sans-serif";

/** Font choices offered by the theme scale (the setup wizard lists these). */
export const FONTS = {
  montserrat: `Montserrat, ${FALLBACK}`,
  inter: `Inter, ${FALLBACK}`,
  bebas: `'Bebas Neue', ${FALLBACK}`,
  noto: FALLBACK,
} as const;

const BUNDLED = ["Montserrat", "Inter", "Bebas Neue"];

// Wait until every bundled face is loaded, so no frame renders with a fallback font.
const handle = delayRender("Loading bundled fonts");
Promise.all(
  [...document.fonts]
    .filter((face) => BUNDLED.includes(face.family.replace(/["']/g, "")))
    .map((face) => face.load()),
)
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
