#!/bin/bash
# One-off setup for the Mac that runs the 6am job.
#
#   bash v2/batch/setup-mac.sh [--drive-account you@gmail.com]
#
# Checks every dependency the unattended run needs, installs what it safely can,
# proves a design actually renders on this machine, and writes the scheduled
# task prompt with this clone's path filled in. Safe to re-run.
#
# It never touches Drive output or the run history; the first real run does that.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
V2="$PWD"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; WARN=$((WARN+1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }
FAIL=0; WARN=0

ACCOUNT=""
[ "${1:-}" = "--drive-account" ] && ACCOUNT="${2:-}"

echo "Tools"
if command -v node >/dev/null; then
  NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  [ "$NODE_MAJOR" -ge 18 ] && ok "node $(node -v)" || bad "node $(node -v) is too old — need 18+ (brew install node)"
else
  bad "node missing — brew install node"
fi
command -v python3 >/dev/null && ok "python3 $(python3 -V 2>&1 | cut -d' ' -f2)" || bad "python3 missing — brew install python"
if python3 -c "import PIL" 2>/dev/null; then
  ok "Pillow"
else
  echo "    installing Pillow…"
  python3 -m pip install --user Pillow >/dev/null 2>&1 \
    || python3 -m pip install --user --break-system-packages Pillow >/dev/null 2>&1
  python3 -c "import PIL" 2>/dev/null && ok "Pillow (installed)" || bad "could not install Pillow — python3 -m pip install Pillow"
fi
[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] \
  && ok "Google Chrome" || bad "Google Chrome missing — it renders the designs. Install it into /Applications"

echo "Google Drive"
if [ -n "$ACCOUNT" ]; then
  printf '{\n  "driveAccount": "%s"\n}\n' "$ACCOUNT" > batch/local.json
  ok "using account $ACCOUNT (saved to batch/local.json, not committed)"
fi
if DRIVE=$(node batch/drive.mjs 2>&1); then
  ok "mounted: $DRIVE"
  STATE=$(node batch/drive.mjs --state)
  if [ -f "$STATE" ]; then
    SINCE=$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d['lastSuccessISO'], 'on', d.get('host','?'))" "$STATE")
    ok "run history found — next run picks up from $SINCE"
  else
    warn "no run history in Drive. The first run will look back 72h and may reprint orders"
    warn "already made. If the old Mac has run before, let Drive finish syncing first."
  fi
else
  bad "$DRIVE"
fi

echo "Dependencies"
if [ -d node_modules ] && [ node_modules -nt package-lock.json ]; then
  ok "node_modules up to date"
else
  echo "    npm ci…"
  npm ci --no-audit --no-fund >/tmp/sock-npm.log 2>&1 && ok "npm ci" || bad "npm ci failed — see /tmp/sock-npm.log"
fi

echo "Slack"
if security find-generic-password -a "$USER" -s sock-print-slack-webhook -w >/dev/null 2>&1; then
  ok "webhook is in this Mac's Keychain"
else
  warn "no webhook on this Mac — alerts would post under your own name."
  warn "Copy the URL from the Slack app's Incoming Webhooks page, then run:"
  warn "  bash v2/batch/set-slack-webhook.sh 'https://hooks.slack.com/services/…'"
fi

echo "Render test"
if [ "$FAIL" -eq 0 ]; then
  TEST=$(mktemp -d)
  printf '%s' '[{"name":"#SETUP-TEST","note":"","lineItems":[{"title":"Test","quantity":1,"sku":"LEEDSSOCKSDAD-6-11","variantTitle":"Dad / 6-11","customAttributes":[]}]}]' > "$TEST/orders.json"
  STARTED=0
  if ! curl -sf -o /dev/null http://localhost:5183/render.html; then
    npm run dev -- --port 5183 --strictPort >"$TEST/vite.log" 2>&1 &
    VITE=$!; STARTED=1
    for _ in $(seq 1 40); do curl -sf -o /dev/null http://localhost:5183/render.html && break; sleep 0.5; done
  fi
  # Render only — straight into a temp folder, so the real socks/ and the
  # generator's report are left alone.
  cp batch/last-run.json "$TEST/last-run.keep" 2>/dev/null
  if node batch/generate.mjs "$TEST/orders.json" --out "$TEST/out" >"$TEST/gen.log" 2>&1 \
     && [ -n "$(ls "$TEST/out"/*.png 2>/dev/null)" ]; then
    ok "rendered a test design ($(du -h "$TEST"/out/*.png | cut -f1)) — Chrome, fonts and server all work"
  else
    bad "test render failed — see $TEST/gen.log"
  fi
  [ -f "$TEST/last-run.keep" ] && cp "$TEST/last-run.keep" batch/last-run.json
  [ "$STARTED" = "1" ] && kill "$VITE" 2>/dev/null
else
  warn "skipped until the problems above are fixed"
fi

echo
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL problem(s) to fix, then run this again."
  exit 1
fi

OUT="batch/scheduled-task.generated.md"
python3 - "$V2" <<'PY'
import sys
v2 = sys.argv[1]
text = open("batch/scheduled-task.md").read().replace("{{V2}}", v2)
open("batch/scheduled-task.generated.md", "w").write(text)
PY
echo "Ready. Last step — in the Claude desktop app on THIS Mac, open a Code session"
echo "in this folder and paste:"
echo
echo "  Create a scheduled task called sock-print-files-daily, titled \"Sock print files — 6am weekdays\","
echo "  cron 0 6 * * 1-5, using the prompt in v2/$OUT exactly as written. Then run it once now."
echo
[ "$WARN" -gt 0 ] && echo "($WARN warning(s) above — worth reading, but none block the run.)"
exit 0
