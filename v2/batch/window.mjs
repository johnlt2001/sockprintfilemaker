// Works out which orders the next scheduled run should fetch.
//
//   node batch/window.mjs           -> prints JSON {since, query, reason}
//   node batch/window.mjs --commit  -> records "now" as the last good run
//
// The window runs from the last SUCCESSFUL run to now, so a missed morning is
// picked up by the next one and Monday sweeps up the weekend without needing a
// special case.
//
// Two guards stop the window going somewhere silly:
//
//   FLOOR_DAYS  The store has unfulfilled orders going back to 2023 that were
//               settled outside Shopify and must never be reprinted. If the
//               state file is missing or stale, the window is clamped to the
//               last 7 days rather than reaching back into that tail.
//   FIRST_RUN   With no state at all, 72h covers a Monday after a weekend.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { stateFile } from "./drive.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// State lives in Drive (see drive.mjs). If Drive is missing, refuse outright:
// guessing a window without history is exactly how old orders get reprinted.
let STATE;
try {
  STATE = stateFile();
} catch (e) {
  console.error(`cannot work out the order window: ${e.message}`);
  process.exit(1);
}
// Where state lived before it moved to Drive. Read once to carry history over.
const LEGACY_STATE = join(here, ".state.json");

const FLOOR_DAYS = 7;
const FIRST_RUN_HOURS = 72;
const ms = { h: 3600e3, d: 86400e3 };

const now = new Date();
const floor = new Date(now - FLOOR_DAYS * ms.d);

function read() {
  for (const path of [STATE, LEGACY_STATE]) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      // try the next location
    }
  }
  return null;
}

if (process.argv.includes("--commit")) {
  const prev = read() || {};
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify({
    lastSuccessISO: now.toISOString(),
    previousSuccessISO: prev.lastSuccessISO || null,
    runs: (prev.runs || 0) + 1,
    host: (await import("node:os")).hostname(),
  }, null, 2));
  console.log(now.toISOString());
  process.exit(0);
}

const state = read();
let since;
let reason;

if (!state?.lastSuccessISO) {
  since = new Date(now - FIRST_RUN_HOURS * ms.h);
  reason = `no previous run recorded — defaulting to the last ${FIRST_RUN_HOURS}h`;
} else {
  const last = new Date(state.lastSuccessISO);
  if (last < floor) {
    since = floor;
    reason = `last run was ${((now - last) / ms.d).toFixed(1)} days ago — clamped to the ${FLOOR_DAYS}-day floor`;
  } else {
    since = last;
    reason = `orders since the last successful run (${last.toISOString()})`;
  }
}

// Shopify's search grammar wants a quoted ISO timestamp.
const iso = since.toISOString();
console.log(JSON.stringify({ since: iso, query: `created_at:>'${iso}'`, reason }, null, 2));
