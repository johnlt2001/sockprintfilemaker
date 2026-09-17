"""Turn batch/last-daily.json into the Slack alert text.

Kept separate from the posting so the message reads the same whether the
pipeline sent it itself or a Claude session had to send it as a fallback.

A clean run or a quiet morning gets one short line -- just enough for a
glance in the morning -- rather than the detailed breakdown a real problem
gets.
"""

import json
import os
import sys

# The reasons in last-daily.json are already written for a human, so they are
# passed through verbatim rather than reworded. These only add what to DO.
HINTS = (
    ("no personalisation text", "customer left the box empty — needs chasing before it can print"),
    ("unmapped team token", "new SKU prefix — add it to batch/sku-teams.json"),
    ("is not supported by the renderer", "known gap: Cricket and Rugby still need their own design"),
    ("has no role in it", "neither the SKU nor the variant title said whose socks these are"),
)

STAGE_HINTS = {
    "drive": "Google Drive for Desktop does not look like it is running.",
    "server": "The dev server did not start — batch/vite.log will say why.",
    "deps": "A tool the pipeline needs is missing on this machine.",
    "orders": "The orders file was missing or unreadable, so nothing could be rendered.",
}


def hint_for(reason):
    low = str(reason or "").lower()
    for needle, hint in HINTS:
        if needle in low:
            return hint
    return None


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "batch/last-daily.json"
    try:
        with open(path) as handle:
            data = json.load(handle)
    except Exception as exc:
        print(f":rotating_light: *Sock print run* — could not read its own result file ({exc}).")
        return

    code = data.get("exitCode")
    folder = os.path.basename(os.path.dirname(data.get("driveFolder", ""))) or "today"
    sheets = data.get("sheets") or []
    problems = (data.get("failed") or []) + (data.get("skipped") or [])
    lines = []

    if code == 0:
        print(
            f":white_check_mark: Sock print run — {data.get('rendered', 0)} "
            f"design(s) on {len(sheets)} sheet(s) in `{folder}/sock print files`."
        )
        return
    if code == 4:
        print(":zzz: Sock print run — no sock orders this morning, nothing to print.")
        return

    if code == 3:
        one = len(problems) == 1
        lines.append(
            f":warning: *Sock print run — sheets are in Drive, but {len(problems)} "
            f"{'item needs' if one else 'items need'} a look*"
        )
        lines.append(
            f"{data.get('rendered', 0)} design(s) on {len(sheets)} sheet(s) in "
            f"`{folder}/sock print files` — *these are printable now.*"
        )
    else:
        lines.append(":rotating_light: *Sock print run — no print files this morning*")
        lines.append(f"Fell over at the *{data.get('stage', '?')}* stage: {data.get('message', '')}")
        extra = STAGE_HINTS.get(data.get("stage"))
        if extra:
            lines.append(extra)

    if problems:
        lines.append("")
        lines.append("*Not printed:*")
        for item in problems[:20]:
            order = item.get("order") or "?"
            sku = item.get("sku") or "no SKU"
            reason = item.get("reason") or item.get("error") or "unknown"
            lines.append(f"• `{order}` [{sku}] — {reason}")
            hint = hint_for(reason)
            if hint:
                lines.append(f"    ↳ {hint}")
        if len(problems) > 20:
            lines.append(f"• …and {len(problems) - 20} more (see batch/last-daily.json)")

    print("\n".join(lines))


main()
