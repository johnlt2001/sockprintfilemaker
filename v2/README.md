# Sock Print File Maker — v2

A rebuild of the original app in which the name and team name **size
themselves automatically**. It lives alongside the original; nothing in the
old app was changed.

```bash
cd v2
npm install
npm run dev
```

## Why the original needed hand-tuning

The old version guessed a font size from the number of characters:

```js
switch (length) {
  case 4: return 460;
  case 5: return 390;
  ...
}
```

Character count is a poor stand-in for width — `WWW` and `III` are the same
length and nothing like the same size — so every new team or unusual name
meant re-tuning the table by hand, and anything outside 4–13 characters fell
back to an unusable 24px.

## What replaces it

The text is measured instead of guessed.

1. **Wait for the font.** Nothing is measured until `document.fonts.load()`
   has resolved for the chosen face. Measuring early silently returns the
   *fallback* font's metrics, which is the usual reason automatic sizing ends
   up almost-but-not-quite right.
2. **Measure real ink.** `canvas.measureText()` gives the actual bounding box
   of the string — `actualBoundingBoxLeft/Right/Ascent/Descent` — not the
   nominal advance width. Metrics are taken once at a reference size and
   stored per 1px, so they can be scaled to anything.
3. **Solve for the size.** `fontSize = columnWidth / measuredWidthPerPixel`.
   Every line then spans its column exactly, whatever it says.

A height cap stops a one- or two-letter name from swallowing the canvas, and
outlined team names fold the stroke width into the calculation so they stay
inside the column.

Because the sizing is derived rather than configured, **all four bundled
typefaces work without any per-font tuning**, and so would any font you add.

## The typeface

The original used Deutschlander. v2 ships four heavy, all-caps display faces
with dependable metrics — Anton (default), Archivo Black, Bebas Neue and
Oswald Bold — switchable from the panel. They are self-hosted in
`src/fonts/`, which matters for export (below).

Anton is condensed, so it holds the longest names best; Archivo Black is the
widest and reads closest to a classic block print.

## Export

The artwork is a single `<svg>`, so exporting is a direct rasterisation —
serialise the SVG, draw it into a canvas, encode a PNG. Nothing screenshots
the DOM, which is what made the old `dom-to-image` exports inconsistent.

The one subtlety: an `<img>` renders SVG in a sandbox that **cannot fetch
external resources**, so a normal `@font-face` URL silently falls back to a
system font in the exported file. The exporter embeds the `.woff2` as a
base64 data URI inside the SVG, which both fixes that and leaves the canvas
untainted so it can still be read back.

PNG exports at 2× with a transparent background. PNG is the only output —
the press wants a raster file, and a second format was one more thing to
pick wrong.

## Adding a team

One object in `src/teams.js`. The per-team quirks that used to be spread
across four separate conditionals are all data now:

```js
{ id: "NEWCASTLE", color: "#000000",
  barStripes: ["#000000", "#FFFFFF"], barStripePct: 10, barBorder: "#FFFFFF",
  textStripes: ["#000000", "#FFFFFF"], textStroke: "#FFFFFF" }
```

| key | effect |
| --- | --- |
| `color` | base colour for the bar and the team name |
| `barFill` | override the bar's solid fill |
| `barStripes` / `barStripePct` | vertical stripes across the bar |
| `barBands` | three horizontal bands across the bar |
| `barBorder` | outline around the bar |
| `textFill` | override the team name's fill |
| `textStripes` | colour the name one letter at a time |
| `textBands` | three horizontal bands through the name |
| `textStroke` | outline around the name |
| `prefix` | small word above the name, e.g. `THE HAMMERS` |

## Layout

| file | role |
| --- | --- |
| `src/measure.js` | font readiness + real ink measurement |
| `src/layout.js` | fits each line, stacks the two columns, emits positioned items |
| `src/Design.jsx` | draws those items as one SVG |
| `src/exportPng.js` | PNG export with the font embedded |
| `src/teams.js` | per-team appearance |
| `src/fonts.js` | typeface registry |
| `src/Controls.jsx`, `src/App.jsx` | UI |

## The daily run

A scheduled task (`sock-print-files-daily`) runs at 6am, Monday to Friday. It
fetches the day's sock orders from Shopify, renders them, lays them up into
40cm press sheets and copies those into Google Drive under
`DD.MM.YY / sock print files`, creating the date folder only if it isn't
already there.

To run it by hand for a given day:

```bash
node batch/window.mjs                      # what window would be fetched, and why
bash batch/run-daily.sh batch/orders.json  # render -> lay up -> copy to Drive
```

| file | role |
| --- | --- |
| `batch/window.mjs` | picks the order window; `--commit` records a good run |
| `batch/run-daily.sh` | the whole deterministic pipeline |
| `batch/drive.mjs` | finds the Drive mount; run history lives in `My Drive/Sock print automation/state.json` |
| `batch/last-daily.json` | machine-readable result, and what Slack reports from |

**Which orders get picked up.** The window runs from the last *successful* run
to now, so a missed morning is swept up by the next one and Monday collects the
weekend without a special case. Two guards keep it sane: the window is clamped
to the last 7 days, and a first run with no state covers 72 hours. That clamp
matters — the store has unfulfilled orders going back to 2023 that were settled
elsewhere, and a naive "print everything unfulfilled" would put a decade of
stale socks on the first sheet.

**Exit codes** are the contract between the script and whatever called it:

| code | meaning |
| --- | --- |
| 0 | everything rendered, sheets are in Drive |
| 3 | sheets are in Drive, but some line items were skipped or failed |
| 4 | no sock orders in the window — a quiet morning, not a failure |
| 1 | hard failure, nothing usable was produced |

Only 1 and 3 post to Slack (`#claude_automations`). A clean run says nothing.

Partial failure is deliberate: if eight of ten socks render, the sheet is built
from those eight and the other two are reported. One odd SKU should not cost you
the morning's printing.

**Drive is written through the local mount**, not the API — Drive for Desktop
has to be running, and the sheets are far too large to push through an API call
as base64. If the mount is missing the run fails at the `drive` stage and says so.

### Who the alerts come from

The Slack connector is authenticated as John, so anything it posts is
indistinguishable from something John actually said. For an alert channel that
is the wrong signal — you want to see at a glance that the machine said it.

So alerts go through an incoming webhook belonging to a small Slack app, and
carry that app's name and icon. A webhook is also the least privilege that does
the job: it posts to exactly one channel and can do nothing else — no reading,
no listing, no posting elsewhere. A bot token with workspace-wide `chat:write`
would be a far bigger key than an alert needs.

Create the app at api.slack.com/apps (*From scratch*, name it whatever the
persona should be, then *Incoming Webhooks* -> *Add New Webhook to Workspace*),
then hand the URL over once:

```bash
batch/set-slack-webhook.sh 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
```

That stores it in the macOS Keychain -- a credential has no business in this
repo -- and posts a test message so you know it landed before you rely on it.

Until that exists, nothing breaks: `slack-notify.sh` exits 2, the run records
`"slack": "not-configured"`, and the scheduled session posts the same text
through the connector under John's name instead.

Note that installing the Claude app in Slack does *not* replace this. That app
lets you `@`-mention Claude inside Slack and get a reply; it is not an outbound
route a scheduled job can push into, and it does not change which identity the
connector posts under.

## Moving the daily run to another Mac

Run history lives in Google Drive, not in the checkout, so the new Mac picks up
exactly where the old one stopped. On the new Mac:

```bash
git clone https://github.com/johnlt2001/sockprintfilemaker.git
bash sockprintfilemaker/v2/batch/setup-mac.sh
```

It checks node, Python/Pillow, Chrome and the Drive mount, installs what it
safely can, renders a test design to prove the machine works, and writes the
scheduled-task prompt with that clone's path filled in. It ends by printing the
one line to paste into the Claude desktop app.

Then **disable the task on the old Mac**, so two machines aren't both printing.
The Slack webhook lives in each Mac's Keychain, so it has to be set again on the
new one (`set-slack-webhook.sh`) — setup tells you if it's missing.
