#!/bin/bash
# Posts a run alert to Slack as the automation's own identity.
#
#   batch/slack-notify.sh --from-summary        # format batch/last-daily.json
#   batch/slack-notify.sh "some other problem"  # arbitrary text
#
# The Slack MCP connector posts as John, so its alerts are indistinguishable
# from things John actually said. An incoming webhook belongs to a Slack app
# instead, so the message carries that app's name and icon.
#
# A webhook is also the least privilege that does the job: it can post to one
# channel and nothing else — it cannot read messages, list channels or post
# anywhere it wasn't scoped to. A bot token with workspace-wide chat:write
# would be a bigger key than an alert needs.
#
# The URL is a credential, so it lives in the macOS Keychain rather than in the
# repo. Set it once:
#
#   security add-generic-password -U -a "$USER" -s sock-print-slack-webhook \
#     -w 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
#
# Exit codes: 0 posted, 2 no webhook configured, 1 posting failed.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

KEYCHAIN_SERVICE="sock-print-slack-webhook"
WEBHOOK="${SLACK_WEBHOOK_URL:-$(security find-generic-password -a "$USER" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null)}"

if [ -z "$WEBHOOK" ]; then
  echo "slack: no webhook configured (keychain service '$KEYCHAIN_SERVICE')" >&2
  exit 2
fi

if [ "${1:-}" = "--from-summary" ]; then
  TEXT=$(python3 batch/format-alert.py batch/last-daily.json) || exit 1
else
  TEXT="${1:-(no message)}"
fi

[ -z "$TEXT" ] && exit 0   # nothing worth saying

# Build the payload in Python so quotes, newlines and apostrophes in customer
# names can't break the JSON.
PAYLOAD=$(python3 -c '
import json, os, sys
body = {"text": sys.argv[1]}
# Best-effort per-message overrides. The dependable way to set the persona is
# the Slack app own name and icon; these are only honoured for some webhooks.
if os.environ.get("SLACK_USERNAME"):
    body["username"] = os.environ["SLACK_USERNAME"]
if os.environ.get("SLACK_ICON_EMOJI"):
    body["icon_emoji"] = os.environ["SLACK_ICON_EMOJI"]
print(json.dumps(body))
' "$TEXT") || exit 1

RESPONSE=$(curl -sS -X POST -H 'Content-type: application/json' \
  --max-time 20 --data "$PAYLOAD" "$WEBHOOK" 2>&1)
CURL=$?

if [ "$CURL" -ne 0 ] || [ "$RESPONSE" != "ok" ]; then
  echo "slack: post failed (curl $CURL): $RESPONSE" >&2
  exit 1
fi
echo "slack: posted"
