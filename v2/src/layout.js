// Composition.
//
// Everything is laid out into a single SVG coordinate space. Each line of text
// is fitted to the width of its column from real measurements, so the name and
// the team name size themselves automatically however long they are.
//
// The output is a flat list of absolutely positioned items, which keeps the
// drawing code free of any layout arithmetic.

import { measureUnit } from "./measure";
import { teamByID } from "./teams";

export const CANVAS_W = 2400;
export const PAD = 70;
export const COL_GAP = 150;
export const COL_W = (CANVAS_W - PAD * 2 - COL_GAP) / 2;

// Outline width, as a fraction of the font size it is applied to.
const STROKE_FRACTION = 0.035;
// "THE" is set at this fraction of the team name's size.
// Size of the small word above the team name ("THE HAMMERS"), as a fraction
// of the team name. It also sets that word's outline weight, so too low and
// the stroke gets too thin to hold on the press.
const PREFIX_RATIO = 0.46;
const PREFIX_GAP = 12;
// Vertical breathing room around the bar in the left column.
const LEFT_GAP = 34;
// The kids' size marker sits above DO NOT and needs more air than the gaps
// inside the block, or it reads as part of the artwork rather than a note to
// the press operator.
const MARK_GAP = 100;
// Default breathing room between the name, WATCHING and the team name.
// Lines are measured ink-tight, so without this they sit flush against each
// other. The gap sliders nudge either side of this.
const BASE_LINE_GAP = Math.round(COL_W * 0.06);
// Nothing is allowed to get taller than this fraction of a column's width,
// which stops a one- or two-letter name from swallowing the canvas.
const MAX_HEIGHT_RATIO = 0.55;

const BAR_BORDER_WIDTH = 8;

/**
 * Fit `text` so that its ink exactly spans `targetW`, then apply the user's
 * scale nudge and clamp the result to a sane height.
 */
function fitToWidth(text, family, targetW, options = {}) {
  const { scale = 1, stroke = false, maxHeight = Infinity } = options;
  const u = measureUnit(text, family);
  if (!u) return null;

  // An outline straddles the glyph edge, adding `strokeWidth` to the ink box
  // overall. Folding it into the divisor keeps the outlined text inside the
  // column instead of overhanging it.
  const allow = stroke ? STROKE_FRACTION : 0;
  let size = (targetW / (u.width + allow)) * scale;
  const totalHeight = u.height + allow;
  if (totalHeight * size > maxHeight) size = maxHeight / totalHeight;

  return build(text, u, size, allow * size);
}

/** Set `text` at an explicit size rather than fitting it to a width. */
function fitToSize(text, family, size, stroke = false) {
  const u = measureUnit(text, family);
  if (!u) return null;
  return build(text, u, size, stroke ? STROKE_FRACTION * size : 0);
}

function build(text, u, size, strokeWidth) {
  return {
    text,
    u,
    size,
    strokeWidth,
    width: u.width * size + strokeWidth,
    height: u.height * size + strokeWidth,
  };
}

/** Convert a fitted line into a positioned draw item, centred in its column. */
function place(fit, colX, y, extra = {}) {
  const half = fit.strokeWidth / 2;
  const boxLeft = colX + (COL_W - fit.width) / 2;
  return {
    kind: "text",
    text: fit.text,
    // The ink box starts at (boxLeft, y); shift to the glyph origin from there.
    x: boxLeft + half + fit.u.left * fit.size,
    y: y + half + fit.u.ascent * fit.size,
    size: fit.size,
    strokeWidth: fit.strokeWidth,
    ...extra,
  };
}

export function buildLayout(options) {
  const {
    name,
    teamID,
    family,
    nameScale = 1,
    teamScale = 1,
    nameGap = 0,
    teamGap = 0,
    barHeight = 96,
    showMark = false,
    markText = "4-7",
  } = options;

  const team = teamByID(teamID);
  const maxHeight = COL_W * MAX_HEIGHT_RATIO;
  const nameText = (name || "").trim().toUpperCase() || "NAME'S";

  // --- fit every line -----------------------------------------------------
  const doNot = fitToWidth("DO NOT", family, COL_W);
  const disturb = fitToWidth("DISTURB", family, COL_W);
  const nameFit = fitToWidth(nameText, family, COL_W, {
    scale: nameScale,
    maxHeight,
  });
  const watching = fitToWidth("WATCHING", family, COL_W);
  const teamFit = fitToWidth(team.id, family, COL_W, {
    scale: teamScale,
    stroke: Boolean(team.textStroke),
    maxHeight,
  });

  // The font was not ready yet; the caller will try again once it is.
  if (!doNot || !disturb || !nameFit || !watching || !teamFit) return null;

  const prefixFit = team.prefix
    ? fitToSize(
        team.prefix,
        family,
        teamFit.size * PREFIX_RATIO,
        Boolean(team.textStroke)
      )
    : null;
  const markFit = showMark ? fitToSize(markText, family, 110) : null;

  if (team.prefix && !prefixFit) return null;
  if (showMark && !markFit) return null;

  // --- stack each column --------------------------------------------------
  const markBlock = markFit
    ? { height: markFit.height + 40, gap: MARK_GAP }
    : null;

  const leftHeight =
    (markBlock ? markBlock.height + markBlock.gap : 0) +
    doNot.height +
    LEFT_GAP +
    barHeight +
    LEFT_GAP +
    disturb.height;

  const gapAfterName = BASE_LINE_GAP + nameGap;
  const gapAfterWatching = BASE_LINE_GAP + teamGap;

  const teamBlockHeight = prefixFit
    ? prefixFit.height + PREFIX_GAP + teamFit.height
    : teamFit.height;

  const rightHeight =
    nameFit.height +
    gapAfterName +
    watching.height +
    gapAfterWatching +
    teamBlockHeight;

  const bodyHeight = Math.max(leftHeight, rightHeight);
  const height = Math.round(PAD * 2 + bodyHeight);

  const leftX = PAD;
  const rightX = PAD + COL_W + COL_GAP;
  let ly = PAD + (bodyHeight - leftHeight) / 2;
  let ry = PAD + (bodyHeight - rightHeight) / 2;

  const items = [];

  // --- left column --------------------------------------------------------
  if (markFit && markBlock) {
    const boxW = markFit.width + 60;
    const boxH = markBlock.height;
    items.push({
      kind: "rect",
      x: leftX + (COL_W - boxW) / 2,
      y: ly,
      w: boxW,
      h: boxH,
      fill: "none",
      border: "#FF0000",
      borderWidth: 6,
    });
    items.push(
      place(markFit, leftX, ly + (boxH - markFit.height) / 2, {
        fill: "#FFFFFF",
      })
    );
    ly += boxH + markBlock.gap;
  }

  items.push(place(doNot, leftX, ly, { fill: "#FFFFFF" }));
  ly += doNot.height + LEFT_GAP;

  items.push({
    kind: "bar",
    x: leftX,
    y: ly,
    w: COL_W,
    h: barHeight,
    fill: team.barFill || team.color,
    stripes: team.barStripes || null,
    stripePct: team.barStripePct || 10,
    bands: team.barBands || null,
    border: team.barBorder || null,
    borderWidth: BAR_BORDER_WIDTH,
  });
  ly += barHeight + LEFT_GAP;

  items.push(place(disturb, leftX, ly, { fill: "#FFFFFF" }));

  // --- right column -------------------------------------------------------
  items.push(place(nameFit, rightX, ry, { fill: "#FFFFFF" }));
  ry += nameFit.height + gapAfterName;

  items.push(place(watching, rightX, ry, { fill: "#FFFFFF" }));
  ry += watching.height + gapAfterWatching;

  const teamPaint = {
    fill: team.textFill || team.color,
    stripes: team.textStripes || null,
    bands: team.textBands || null,
    stroke: team.textStroke || null,
  };

  if (prefixFit) {
    items.push(
      place(prefixFit, rightX, ry, {
        fill: teamPaint.fill,
        bands: teamPaint.bands,
        stroke: teamPaint.stroke,
      })
    );
    ry += prefixFit.height + PREFIX_GAP;
  }

  items.push(place(teamFit, rightX, ry, teamPaint));

  return { width: CANVAS_W, height, items, team };
}
