#!/bin/bash
# Stores the Slack incoming-webhook URL and proves it works.
#
#   batch/set-slack-webhook.sh 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
#
# The URL is a credential — anyone holding it can post to the channel — so it
# goes into the macOS Keychain, not into this repo. Passing it as an argument
# does put it in your shell history; run `history -d` afterwards, or prefix the
# command with a space if HIST_IGNORE_SPACE is set.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

SERVICE="sock-print-slack-webhook"
URL="${1:-}"

if [ -z "$URL" ]; then
  echo "usage: batch/set-slack-webhook.sh 'https://hooks.slack.com/services/...'" >&2
  exit 2
fi

case "$URL" in
  https://hooks.slack.com/services/*) ;;
  *)
    echo "that does not look like a Slack incoming-webhook URL." >&2
    echo "it should start with https://hooks.slack.com/services/" >&2
    exit 2
    ;;
esac

security add-generic-password -U -a "$USER" -s "$SERVICE" -w "$URL" \
  || { echo "could not write to the keychain" >&2; exit 1; }
echo "stored in the keychain as '$SERVICE'"

echo "sending a test message…"
if ./batch/slack-notify.sh ":white_check_mark: Sock print bot is wired up. This channel will only hear from me when a run has a problem."; then
  echo
  echo "done — check #claude_automations. From now on the 6am alerts post as this bot"
  echo "rather than under your own name."
else
  echo
  echo "stored, but the test post failed. Check the webhook URL is the one Slack gave you" >&2
  echo "and that the app is still installed to the workspace." >&2
  exit 1
fi
