// Batch print-file generator.
//
// Renders each sock order through the same code the app uses, in headless
// Chrome, and writes a transparent PNG per order.
//
//   node batch/generate.mjs <orders.json> [--out DIR] [--font Anton] [--dry]
//
// <orders.json> is the shape the Shopify GraphQL query returns:
//   [{ name, note, customer,
//      lineItems: [{ title, sku, variantTitle, quantity, customAttributes }] }]
//
// variantTitle and note are not optional extras: Spurs and Liverpool SKUs carry
// no role or size, so those come from the variant title, and eBay orders keep
// the personalisation on a "Text:" line in the order note.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { skuOf, toJob } from "./parse.mjs";
import { TEAM_IDS } from "../src/teams.js";

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = process.env.RENDER_URL || "http://localhost:5183";
const FRAME = { width: 2400, height: 1800 };   // must match render.html
const SCALE = 2;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const ordersPath = args.find((a) => !a.startsWith("--"));
const outDir = resolve(flag("out", join(here, "..", "socks")));
const fontID = flag("font", "Anton");
const dryRun = args.includes("--dry");

if (!ordersPath) {
  console.error("usage: node batch/generate.mjs <orders.json> [--out DIR] [--font NAME] [--dry]");
  process.exit(2);
}

const safe = (s) =>
  String(s || "").trim().replace(/[^\w'-]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase() || "UNTITLED";

function chromeShot(url, outFile) {
  return new Promise((done, fail) => {
    const child = spawn(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-sandbox",
      `--force-device-scale-factor=${SCALE}`,
      "--default-background-color=00000000",
      `--window-size=${FRAME.width},${FRAME.height}`,
      "--virtual-time-budget=15000",
      `--screenshot=${outFile}`,
      url,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0 ? done() : fail(new Error(`chrome exited ${code}: ${stderr.slice(-400)}`))
    );
  });
}

// Accept either a hand-written array or the Shopify GraphQL response verbatim.
// The scheduled run dumps the API response straight to disk, so reshaping it by
// hand is one more thing that can go wrong at 6am for no benefit.
const unwrap = (v) => (Array.isArray(v) ? v : v && Array.isArray(v.nodes) ? v.nodes : []);

const raw = JSON.parse(readFileSync(resolve(ordersPath), "utf8"));
const orders = (Array.isArray(raw)
  ? raw
  : unwrap(raw.orders).length || raw.orders
  ? unwrap(raw.orders)
  : unwrap(raw?.data?.orders)).map((o) => ({ ...o, lineItems: unwrap(o.lineItems) }));

const jobs = [];
const skipped = [];

for (const order of orders) {
  for (const item of order.lineItems) {
    const result = toJob(order, item);
    if (!result.ok) {
      skipped.push({ order: order.name, sku: skuOf(item), reason: result.reason });
      continue;
    }
    if (!TEAM_IDS.includes(result.job.teamID)) {
      skipped.push({ order: order.name, sku: skuOf(item), reason: `team "${result.job.teamID}" missing from src/teams.js` });
      continue;
    }
    // A line item for two pairs needs two print files.
    const copies = Math.max(1, Number(result.job.quantity) || 1);
    for (let copy = 1; copy <= copies; copy += 1) {
      jobs.push({ ...result.job, copy, copies });
    }
  }
}

console.log(`${jobs.length} print file(s) to render, ${skipped.length} line item(s) skipped\n`);
for (const s of skipped) console.log(`  SKIP ${s.order} [${s.sku}] — ${s.reason}`);
if (skipped.length) console.log("");

mkdirSync(outDir, { recursive: true });

if (dryRun) {
  for (const j of jobs) {
    console.log(`  DRY  ${j.order.padEnd(16)} ${j.name.padEnd(14)} ${j.teamID.padEnd(12)} ${(j.size || "?").padEnd(5)}` +
      (j.showMark ? " [4-7 mark]" : "") + (j.possessiveAdded ? " (added 's)" : ""));
  }
  writeFileSync(join(here, "last-plan.json"), JSON.stringify({ jobs, skipped }, null, 2));
  process.exit(0);
}

const report = [];

for (const job of jobs) {
  const payload = Buffer.from(JSON.stringify({
    name: job.name,
    teamID: job.teamID,
    fontID,
    showMark: Boolean(job.showMark),
    markText: job.markText || "",
  }), "utf8").toString("base64");
  const url = `${BASE_URL}/render.html?data=${encodeURIComponent(payload)}`;
  const suffix = job.copies > 1 ? `_${job.copy}of${job.copies}` : "";
  const file = join(outDir, `${safe(job.order)}_${safe(job.name)}_${safe(job.teamID)}_${safe(job.size || "6-11")}${suffix}.png`);

  process.stdout.write(`  ${job.order.padEnd(16)} ${job.name.padEnd(14)} ${job.teamID.padEnd(12)} ${(job.size || "?").padEnd(5)} `);
  try {
    await chromeShot(url, file);
    const { size } = statSync(file);
    // A blank frame comes out tiny; a real print file is tens of kilobytes.
    if (size < 5000) throw new Error(`output looks blank (${size} bytes)`);
    console.log(`ok  ${(size / 1024).toFixed(0)} KB`);
    report.push({ ...job, file, bytes: size, status: "ok" });
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
    report.push({ ...job, file, status: "failed", error: e.message });
  }
}

writeFileSync(join(here, "last-run.json"), JSON.stringify({ generated: new Date().toISOString(), report, skipped }, null, 2));
console.log(`\nreport: ${join(here, "last-run.json")}`);
