#!/usr/bin/env bash
# Stars Cash Flow API — curl walkthrough.
# Usage: STARS_CASH_FLOW_API_KEY=your-key ./examples/curl.sh
set -euo pipefail

API="${STARS_CASH_FLOW_API_BASE:-https://api-stars.ros.media/api/v2}"
KEY="${STARS_CASH_FLOW_API_KEY:-}"

echo "== services (public, no key) =="
curl -s -X POST "$API" -d action=services | head -c 800; echo; echo

if [ -z "$KEY" ]; then
  echo "Set STARS_CASH_FLOW_API_KEY to run the authenticated calls." >&2
  exit 0
fi

echo "== balance =="
curl -s -X POST "$API" -d action=balance -d key="$KEY"; echo; echo

# Pricing is on you before ordering: cost = rate * quantity / 1000.
# The order below is COMMENTED OUT because it spends real balance. Uncomment
# only after you've priced it and a human approved the spend.
#
# echo "== add (SPENDS BALANCE) =="
# curl -s -X POST "$API" \
#   -d action=add -d key="$KEY" \
#   -d service=1 -d link="https://t.me/mychannel" -d quantity=1000; echo
#
# echo "== status =="
# curl -s -X POST "$API" -d action=status -d key="$KEY" -d order=12345; echo
#
# echo "== cancel (refunds remainder) =="
# curl -s -X POST "$API" -d action=cancel -d key="$KEY" -d orders=12345; echo
