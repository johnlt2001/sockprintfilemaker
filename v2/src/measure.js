// Text measurement.
//
// The old version guessed a font size from the number of characters, which
// meant every new team or an unusual name needed the table re-tuned by hand.
// Here we ask the browser for the real ink bounds of the string instead, so
// the sizing is exact for any text in any of the available fonts.
//
// Two details make this reliable:
//
//  1. Measurements are taken at a fixed reference size and stored per 1px of
//     font size, so a caller can scale them to whatever size it needs.
//  2. Nothing is measured until the webfont has actually loaded. Measuring too
//     early silently returns the fallback font's metrics, which is the classic
//     way automatic sizing ends up slightly wrong.

const REFERENCE_SIZE = 200;

let sharedContext = null;
function context() {
  if (!sharedContext) {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    sharedContext = canvas.getContext("2d");
  }
  return sharedContext;
}

// Resolves once `family` is loaded and safe to measure.
export async function ensureFontReady(family) {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`${REFERENCE_SIZE}px "${family}"`);
  } catch {
    // An unavailable face still resolves below; measurement falls back.
  }
  try {
    await document.fonts.ready;
  } catch {
    // Ignore — worst case we measure a moment early.
  }
}

/**
 * Ink metrics for `text`, normalised to a font size of 1.
 *
 * Multiply any of these by a font size to get user units at that size:
 *   width   full ink width, left edge of the first glyph to right edge of last
 *   height  full ink height, cap/ascender top to descender bottom
 *   left    offset from the text origin to the ink's left edge (usually small
 *           and negative); needed to position the ink box exactly
 *   ascent  origin to ink top, used the same way vertically
 */
export function measureUnit(text, family) {
  if (!text) return null;
  const ctx = context();
  ctx.font = `${REFERENCE_SIZE}px "${family}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const m = ctx.measureText(text);
  const left = num(m.actualBoundingBoxLeft, 0);
  const right = num(m.actualBoundingBoxRight, m.width);
  const ascent = num(m.actualBoundingBoxAscent, REFERENCE_SIZE * 0.72);
  const descent = num(m.actualBoundingBoxDescent, 0);

  const width = left + right;
  const height = ascent + descent;
  if (!(width > 0) || !(height > 0)) return null;

  return {
    width: width / REFERENCE_SIZE,
    height: height / REFERENCE_SIZE,
    left: left / REFERENCE_SIZE,
    ascent: ascent / REFERENCE_SIZE,
    descent: descent / REFERENCE_SIZE,
  };
}

function num(value, fallback) {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}
