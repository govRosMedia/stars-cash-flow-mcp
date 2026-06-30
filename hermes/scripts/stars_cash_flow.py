#!/usr/bin/env python3
"""Stars Cash Flow reseller API CLI — stdlib only, no dependencies.

Drives the JustAnotherPanel-compatible API at /api/v2. Used by the Hermes
`stars-cash-flow` skill, and works standalone for any agent or shell.

Money safety: `order` and `cancel` spend/refund real USD balance, so they
refuse to run without --confirm. Without it they print an estimate instead.

Env:
  STARS_CASH_FLOW_API_KEY   reseller API key (required for all but `services`)
  STARS_CASH_FLOW_API_BASE  endpoint (default https://api-stars.ros.media/api/v2)

Examples:
  stars_cash_flow.py services
  stars_cash_flow.py balance
  stars_cash_flow.py price  --service 1 --link https://t.me/c --quantity 1000
  stars_cash_flow.py order  --service 1 --link https://t.me/c --quantity 1000 --confirm
  stars_cash_flow.py status --order 12345
  stars_cash_flow.py status --orders 1,2,3
  stars_cash_flow.py cancel --orders 1,2,3 --confirm
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API_BASE = os.environ.get("STARS_CASH_FLOW_API_BASE", "https://api-stars.ros.media/api/v2")


def _call(**data):
    body = urllib.parse.urlencode({k: v for k, v in data.items() if v is not None}).encode()
    req = urllib.request.Request(
        API_BASE,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode()
    except urllib.error.URLError as e:
        sys.exit(f"network error calling {API_BASE}: {e}")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        sys.exit(f"non-JSON response from {API_BASE}: {raw[:200]}")
    if isinstance(payload, dict) and "error" in payload:
        sys.exit(f"API error: {payload['error']}")
    return payload


def _key():
    key = os.environ.get("STARS_CASH_FLOW_API_KEY")
    if not key:
        sys.exit("STARS_CASH_FLOW_API_KEY is not set (get one from @StarsCashFlowbot → Reseller).")
    return key


def _find_service(service_id):
    for s in _call(action="services"):
        if int(s["service"]) == int(service_id):
            return s
    sys.exit(f"unknown service id {service_id} — run `services` for the catalog.")


def _estimate(service_id, link, quantity):
    svc = _find_service(service_id)
    lo, hi = int(svc["min"]), int(svc["max"])
    if not (lo <= quantity <= hi):
        sys.exit(f"quantity {quantity} out of range for '{svc['name']}' (min {lo}, max {hi}).")
    cost = round(float(svc["rate"]) * quantity / 1000, 4)
    return svc, cost


def _parse_ids(raw):
    """Validate a comma-separated id list — reject any non-integer instead of
    silently dropping it (a typo like 123,abc must not become just 123)."""
    toks = [x.strip() for x in str(raw).split(",") if x.strip()]
    bad = [t for t in toks if not t.isdigit()]
    if not toks or bad:
        sys.exit(f"invalid order ids {raw!r} — expected comma-separated integers")
    return ",".join(toks)


def _print(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description="Stars Cash Flow reseller API CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("services", help="list the service catalog (no key)")
    sub.add_parser("balance", help="show USD balance of the key")

    pr = sub.add_parser("price", help="estimate the cost of an order (no spend)")
    pr.add_argument("--service", type=int, required=True)
    pr.add_argument("--link", help="target link (required by the API for most services)")
    pr.add_argument("--quantity", type=int, required=True)

    od = sub.add_parser("order", help="place an order (SPENDS balance, needs --confirm)")
    od.add_argument("--service", type=int, required=True)
    od.add_argument("--link", help="target link (required by the API for most services)")
    od.add_argument("--quantity", type=int, required=True)
    od.add_argument("--confirm", action="store_true", help="actually place the order")

    st = sub.add_parser("status", help="order status")
    st.add_argument("--order", type=int)
    st.add_argument("--orders", help="comma-separated ids (<=100)")

    cn = sub.add_parser("cancel", help="cancel orders, refund remainder (needs --confirm)")
    cn.add_argument("--orders", required=True, help="comma-separated ids")
    cn.add_argument("--confirm", action="store_true", help="actually cancel")

    a = p.parse_args()

    if a.cmd == "services":
        _print(_call(action="services"))

    elif a.cmd == "balance":
        _print(_call(action="balance", key=_key()))

    elif a.cmd == "price":
        svc, cost = _estimate(a.service, a.link, a.quantity)
        _print({"service_id": svc["service"], "service_name": svc["name"], "link": a.link,
                "quantity": a.quantity, "rate_per_1000_usd": svc["rate"], "cost_usd": f"{cost:.4f}"})

    elif a.cmd == "order":
        svc, cost = _estimate(a.service, a.link, a.quantity)
        if not a.confirm:
            _print({"requires_confirmation": True,
                    "message": f"Would spend ${cost:.4f}. Re-run with --confirm to place.",
                    "service_name": svc["name"], "link": a.link, "quantity": a.quantity,
                    "cost_usd": f"{cost:.4f}"})
            return
        res = _call(action="add", key=_key(), service=a.service, link=a.link, quantity=a.quantity)
        # estimated_cost_usd is the quote-time figure; the authoritative charge is on
        # the order (see `status`).
        _print({"placed": True, "order": res.get("order"), "estimated_cost_usd": f"{cost:.4f}",
                "service_name": svc["name"]})

    elif a.cmd == "status":
        if a.orders:
            ids = _parse_ids(a.orders)
            _print(_call(action="status", key=_key(), orders=ids))
        elif a.order is not None:
            _print(_call(action="status", key=_key(), order=a.order))
        else:
            sys.exit("provide --order or --orders")

    elif a.cmd == "cancel":
        ids = _parse_ids(a.orders)
        if not a.confirm:
            _print({"requires_confirmation": True,
                    "message": f"Would cancel orders {ids} and refund the remainder. Re-run with --confirm."})
            return
        _print(_call(action="cancel", key=_key(), orders=ids))


if __name__ == "__main__":
    main()
