Build today's sock print files and put them in Google Drive.

Work in this directory — always quote the path:
"{{V2}}"

Do these steps in order. Do not improvise around them — the pipeline is deterministic on purpose.

## 1. Work out the order window

Run: `node batch/window.mjs`

It prints JSON like {"since": "...", "query": "created_at:>'...'", "reason": "..."}.
Use its `query` value verbatim in step 2. Do not invent your own date range: the
store has stale unfulfilled orders going back to 2023 that must never be
reprinted, and this script is what keeps the window away from them.

If it exits non-zero, STOP. It refuses when Google Drive isn't mounted, because
guessing a window without the run history in Drive is how old orders get
reprinted. Report its error with:

  bash batch/slack-notify.sh "Sock print run: no print files this morning — <the error it printed>"

## 2. Fetch the orders from Shopify

Use the Shopify MCP connector (graphql_query). Run exactly this query, passing
the `query` string from step 1 as the `q` variable:

query DailySocks($q: String!, $after: String) {
  orders(first: 50, query: $q, sortKey: CREATED_AT, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      name
      note
      createdAt
      customer { firstName lastName }
      lineItems(first: 25) {
        nodes {
          title
          sku
          variantTitle
          quantity
          customAttributes { key value }
        }
      }
    }
  }
}

`note`, `variantTitle` and `customAttributes` are all required. Spurs and
Liverpool SKUs carry no team or role, so those come from the variant title; eBay
orders keep the personalisation on a "Text:" line in the order note; and some
eBay imports leave `sku` null and put the SKU in a custom attribute.

If `hasNextPage` is true, fetch the next page with `after` set to `endCursor`
and merge the nodes.

This is a read-only query. Never fulfil, modify or cancel an order.

If the fetch fails outright, report it with
`bash batch/slack-notify.sh "Sock print run: could not fetch today's orders from Shopify — <what went wrong>"`
and stop.

## 3. Save the response

Write the fetched orders to `batch/orders-today.json`. The generator accepts the
raw GraphQL response shape, so save `{"data":{"orders":{"nodes":[...]}}}` or just
the array of order nodes. Do not reshape the line items by hand.

If the window returned no orders, still write `[]` and carry on — the script
handles a quiet morning correctly.

## 4. Run the pipeline

Run: `bash batch/run-daily.sh batch/orders-today.json`

It renders each design in headless Chrome, lays them up into 40cm press sheets,
creates (or reuses) a Drive folder named for today in DD.MM.YY format with a
"sock print files" folder inside, and copies the sheets there. A busy day can
take a few minutes — let it finish.

Exit codes:
  0 — everything rendered, sheets are in Drive
  3 — sheets are in Drive, but some line items were skipped or failed
  4 — no sock orders in the window, nothing to print
  1 — hard failure, nothing usable was produced

## 5. Report

The pipeline posts its own Slack alert as the sock print bot. Do NOT post a
second one. Read `batch/last-daily.json` and check its `slack` field:

  "posted"          — already in Slack. Nothing more to do.
  "skipped"         — clean run or quiet morning. Correct: stay silent.
  "not-configured"  — no webhook on this Mac. Post the output of
                      `python3 batch/format-alert.py batch/last-daily.json`
                      to channel C0C1UAV9ACF with the Slack MCP connector, and
                      add: "_(posted as John — run batch/set-slack-webhook.sh on
                      this Mac)_"
  "failed"          — webhook exists but the post failed. Post the same
                      fallback, and say the webhook itself failed.

Never post on exit code 0 or 4. Do not attach sheets to Slack, post anywhere
else, or email anyone.

## Finally

One paragraph: how many designs, how many sheets, which Drive folder, and
anything that was skipped.
