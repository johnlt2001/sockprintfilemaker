#!/bin/bash
# Daily print-file run: orders JSON in, print-ready sheets in Google Drive out.
#
#   batch/run-daily.sh batch/orders-today.json
#
# Everything here is deterministic. The scheduled Claude session only fetches
# the orders and reports the result, so the pipeline itself behaves the same
# whether a human or a schedule started it.
#
# Exit codes are the contract with the caller:
#   0  every design rendered and the sheets are in Drive
#   3  sheets are in Drive but some line items were skipped or failed
#   4  no sock orders in the window — nothing to do, not a failure
#   1  hard failure, nothing usable was produced
#
# Writes batch/last-daily.json either way, which is what gets reported to Slack.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
ROOT="$PWD"

ORDERS="${1:-batch/orders-today.json}"
PORT=5183
DRIVE_ROOT="$(node "$ROOT/batch/drive.mjs" 2>/dev/null)"
DATE_DIR="$(date +%d.%m.%y)"
DEST="$DRIVE_ROOT/$DATE_DIR/sock print files"

VITE_PID=""
STARTED_VITE=0
SUMMARY="$ROOT/batch/last-daily.json"

# Records the outcome for the caller, then leaves. Anything that can go wrong
# funnels through here so Slack always has a machine-readable reason.
finish() {
  local code="$1" stage="$2" message="$3"
  [ "$STARTED_VITE" = "1" ] && [ -n "$VITE_PID" ] && kill "$VITE_PID" 2>/dev/null
  python3 - "$SUMMARY" "$code" "$stage" "$message" "$DEST" "$ROOT" <<'PY'
import json, os, sys
summary, code, stage, message, dest, root = sys.argv[1:7]
out = {
    "finishedAt": __import__("datetime").datetime.now().astimezone().isoformat(),
    "exitCode": int(code), "stage": stage, "message": message,
    "driveFolder": dest, "sheets": [], "rendered": 0, "failed": [], "skipped": [],
}
try:
    with open(os.path.join(root, "batch", "last-run.json")) as f:
        run = json.load(f)
    out["rendered"] = sum(1 for r in run.get("report", []) if r.get("status") == "ok")
    out["failed"] = [{"order": r.get("order"), "sku": r.get("sku"), "error": r.get("error")}
                     for r in run.get("report", []) if r.get("status") != "ok"]
    out["skipped"] = run.get("skipped", [])
except Exception:
    pass
if os.path.isdir(dest):
    out["sheets"] = sorted(f for f in os.listdir(dest) if f.lower().endswith(".png"))
with open(summary, "w") as f:
    json.dump(out, f, indent=2)
print(f"\n[{stage}] {message}")
PY

  # The pipeline posts its own alerts rather than leaving it to the caller, so
  # a morning where the scheduled session itself falls over still reaches
  # Slack -- and so a clean run gets a one-line heartbeat for the morning
  # glance, not just silence.
  local slack="skipped"
  "$ROOT/batch/slack-notify.sh" --from-summary
  case $? in
    0) slack="posted" ;;
    2)
      # No webhook configured. That's worth a fallback ping under John's own
      # identity for a real problem, but a routine clean run or quiet morning
      # should just stay quiet rather than nag him to set one up.
      if [ "$code" = "0" ] || [ "$code" = "4" ]; then
        slack="skipped"
      else
        slack="not-configured"
      fi
      ;;
    *) slack="failed" ;;
  esac
  python3 -c 'import json,sys
with open(sys.argv[1]) as f: data = json.load(f)
data["slack"] = sys.argv[2]
with open(sys.argv[1], "w") as f: json.dump(data, f, indent=2)' "$SUMMARY" "$slack"

  exit "$code"
}

[ -f "$ORDERS" ] || finish 1 "orders" "orders file not found: $ORDERS"
python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$ORDERS" \
  || finish 1 "orders" "orders file is not valid JSON: $ORDERS"

[ -n "$DRIVE_ROOT" ] && [ -d "$DRIVE_ROOT" ] || finish 1 "drive" \
  "$(node "$ROOT/batch/drive.mjs" 2>&1 >/dev/null)"

command -v node >/dev/null || finish 1 "deps" "node is not on PATH"
python3 -c "import PIL" 2>/dev/null || finish 1 "deps" "Pillow is not installed for python3"
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] \
  || finish 1 "deps" "Google Chrome not found — it is the SVG rasteriser"

# Start clean: socks/ is the layout's input, so a leftover file from yesterday
# would be laid up onto today's sheet.
rm -rf "$ROOT/socks" "$ROOT/output"
mkdir -p "$ROOT/socks" "$ROOT/output"

# Reuse a dev server if one is already up, otherwise start one and stop it again
# at the end. --strictPort so we never silently render against the wrong app.
if curl -sf -o /dev/null "http://localhost:$PORT/render.html"; then
  echo "using the dev server already on :$PORT"
else
  npm run dev -- --port "$PORT" --strictPort >"$ROOT/batch/vite.log" 2>&1 &
  VITE_PID=$!
  STARTED_VITE=1
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "http://localhost:$PORT/render.html" && break
    sleep 0.5
  done
  curl -sf -o /dev/null "http://localhost:$PORT/render.html" \
    || finish 1 "server" "dev server did not come up on :$PORT — see batch/vite.log"
fi

node batch/generate.mjs "$ORDERS" --out "$ROOT/socks"
GEN=$?
[ "$GEN" -eq 0 ] || finish 1 "render" "generate.mjs exited $GEN"

RENDERED=$(ls -1 "$ROOT/socks"/*.png 2>/dev/null | wc -l | tr -d ' ')
PROBLEMS=$(python3 -c "
import json
run = json.load(open('batch/last-run.json'))
print(sum(1 for r in run.get('report', []) if r.get('status') != 'ok') + len(run.get('skipped', [])))
" 2>/dev/null || echo 0)

# No socks in the window is a normal quiet morning, not something to alert on.
[ "$RENDERED" -eq 0 ] && finish 4 "render" "no sock orders in this window — nothing to print"

python3 layout.py || finish 1 "layout" "layout.py failed after rendering $RENDERED design(s)"
ls -1 "$ROOT/output"/*.png >/dev/null 2>&1 || finish 1 "layout" "layout.py produced no sheets"

# mkdir -p is deliberate: if today's folder is already there it is reused, which
# is what was asked for.
mkdir -p "$DEST" || finish 1 "drive" "could not create $DEST"
cp "$ROOT/output"/*.png "$DEST/" || finish 1 "drive" "copying the sheets into Drive failed"

COPIED=$(ls -1 "$DEST"/*.png 2>/dev/null | wc -l | tr -d ' ')
[ "$COPIED" -eq 0 ] && finish 1 "drive" "sheets did not land in $DEST"

node batch/window.mjs --commit >/dev/null

if [ "$PROBLEMS" -gt 0 ]; then
  finish 3 "done" "$RENDERED design(s) on $COPIED sheet(s) in Drive, but $PROBLEMS line item(s) need a look"
fi
finish 0 "done" "$RENDERED design(s) laid up onto $COPIED sheet(s) in $DATE_DIR/sock print files"
