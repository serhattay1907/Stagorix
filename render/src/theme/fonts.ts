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
import "@fontsource/oswald/latin-700.css";
import "@fontsource/oswald/latin-ext-700.css";
import "@fontsource/playfair-display/latin-800.css";
import "@fontsource/playfair-display/latin-ext-800.css";
import "@fontsource/playfair-display/latin-900.css";
import "@fontsource/playfair-display/latin-ext-900.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-ext-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-grotesk/latin-ext-700.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-ext-500.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-ext-700.css";
import "@fontsource/poppins/latin-800.css";
import "@fontsource/poppins/latin-ext-800.css";
import "@fontsource/poppins/latin-900.css";
import "@fontsource/poppins/latin-ext-900.css";
import "@fontsource/righteous/latin-400.css";
import "@fontsource/righteous/latin-ext-400.css";
import { cancelRender, continueRender, delayRender } from "remotion";

const FALLBACK = "'Noto Sans', 'Noto Color Emoji', sans-serif";

/** Font choices offered by the theme scale (the setup wizard lists these). */
export const FONTS = {
  montserrat: `Montserrat, ${FALLBACK}`,
  inter: `Inter, ${FALLBACK}`,
  bebas: `'Bebas Neue', ${FALLBACK}`,
  oswald: `Oswald, ${FALLBACK}`,
  playfair: `'Playfair Display', ${FALLBACK}`,
  spaceGrotesk: `'Space Grotesk', ${FALLBACK}`,
  poppins: `Poppins, ${FALLBACK}`,
  righteous: `Righteous, ${FALLBACK}`,
  noto: FALLBACK,
} as const;

const BUNDLED = ["Montserrat", "Inter", "Bebas Neue", "Oswald", "Playfair Display", "Space Grotesk", "Poppins", "Righteous"];

// Wait until every bundled face is loaded, so no frame renders with a fallback font.
const handle = delayRender("Loading bundled fonts");
Promise.all(
  [...document.fonts]
    .filter((face) => BUNDLED.includes(face.family.replace(/["']/g, "")))
    .map((face) => face.load()),
)
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
