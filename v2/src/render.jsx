// Headless render target.
//
// Loaded by the batch generator in headless Chrome, one order at a time. It
// reuses the same layout and drawing code as the app, so a generated print
// file is identical to what the operator sees on screen.
//
// Usage: /render.html?data=<base64 JSON {name, teamID, fontID}>
//
// The page signals completion by setting <html data-ready>, and reports any
// problem via <html data-error> so the generator can fail loudly rather than
// screenshotting a blank frame.

import ReactDOM from "react-dom/client";
import Design from "./Design";
import { injectFontFaces, DEFAULT_FONT, fontByID } from "./fonts";
import { buildLayout } from "./layout";
import { ensureFontReady } from "./measure";
import { teamByID, TEAM_IDS } from "./teams";

function readParams() {
  const raw = new URLSearchParams(location.search).get("data");
  if (!raw) throw new Error("no data parameter");
  return JSON.parse(decodeURIComponent(escape(atob(raw))));
}

function fail(message) {
  document.documentElement.dataset.error = message;
  document.documentElement.dataset.ready = "1";
}

async function main() {
  let params;
  try {
    params = readParams();
  } catch (e) {
    return fail(`bad parameters: ${e.message}`);
  }

  const fontID = fontByID(params.fontID || DEFAULT_FONT).id;
  const teamID = params.teamID;

  if (!TEAM_IDS.includes(teamID)) {
    return fail(`unknown team "${teamID}"`);
  }

  injectFontFaces();
  await ensureFontReady(fontID);

  const layout = buildLayout({
    name: params.name,
    teamID: teamByID(teamID).id,
    family: fontID,
    nameScale: params.nameScale ?? 1,
    teamScale: params.teamScale ?? 1,
    nameGap: params.nameGap ?? 0,
    teamGap: params.teamGap ?? 0,
    barHeight: params.barHeight ?? 96,
    showMark: params.showMark ?? false,
    markText: params.markText ?? "4-7",
  });

  if (!layout) return fail("layout could not be built");

  // A layout taller than the frame would be scaled down by the CSS max-height,
  // shrinking the whole design. Refuse rather than ship a mis-sized print file.
  const FRAME_H = 1800;
  if (layout.height > FRAME_H) {
    return fail(`layout is ${Math.round(layout.height)}px tall, frame is ${FRAME_H}px — it would be scaled down`);
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <Design layout={layout} family={fontID} className="artwork" />
  );

  // One more frame so the SVG is painted before the screenshot is taken.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.documentElement.dataset.width = String(layout.width);
      document.documentElement.dataset.height = String(layout.height);
      document.documentElement.dataset.ready = "1";
    })
  );
}

main().catch((e) => fail(e.message || String(e)));
