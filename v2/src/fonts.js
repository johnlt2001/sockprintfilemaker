// Display faces available to the artwork.
//
// Every one of these is a heavy, all-caps-friendly display font with reliable
// metrics, which is what makes automatic sizing possible: we can ask the
// browser exactly how wide a string will be and trust the answer.
import antonUrl from "./fonts/anton.woff2";
import archivoBlackUrl from "./fonts/archivo-black.woff2";
import bebasNeueUrl from "./fonts/bebas-neue.woff2";
import oswaldUrl from "./fonts/oswald-700.woff2";

export const FONTS = [
  {
    id: "Anton",
    label: "Anton",
    url: antonUrl,
    note: "Heavy and condensed — fits the longest names",
  },
  {
    id: "Archivo Black",
    label: "Archivo Black",
    url: archivoBlackUrl,
    note: "Heavy and wide — closest to a classic block print",
  },
  {
    id: "Bebas Neue",
    label: "Bebas Neue",
    url: bebasNeueUrl,
    note: "Very condensed — tall and narrow",
  },
  {
    id: "Oswald",
    label: "Oswald Bold",
    url: oswaldUrl,
    note: "Condensed with a little more letter spacing",
  },
];

export const DEFAULT_FONT = "Anton";

export function fontByID(id) {
  return FONTS.find((f) => f.id === id) || FONTS[0];
}

// Registering the faces from JS (rather than CSS) keeps the hashed asset URLs
// that Vite generates in one place, so the PNG exporter can reuse them.
let injected = false;
export function injectFontFaces() {
  if (injected) return;
  injected = true;
  const css = FONTS.map(
    (f) =>
      `@font-face{font-family:"${f.id}";src:url(${f.url}) format("woff2");font-weight:400;font-style:normal;font-display:block;}`
  ).join("\n");
  const style = document.createElement("style");
  style.setAttribute("data-sock-fonts", "");
  style.textContent = css;
  document.head.appendChild(style);
}
