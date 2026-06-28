#!/usr/bin/env python3
"""Stars Cash Flow API — Python walkthrough (stdlib only, no dependencies).

Usage:
    STARS_CASH_FLOW_API_KEY=your-key python3 examples/python_example.py

Demonstrates the safe flow: discover -> price -> (human approves) -> order -> track.
The actual order call is guarded so this script never spends by accident.
"""
import json
import os
import urllib.parse
import urllib.request

API = os.environ.get("STARS_CASH_FLOW_API_BASE", "https://api-stars.ros.media/api/v2")
KEY = os.environ.get("STARS_CASH_FLOW_API_KEY")


def call(**data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(API, data=body, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        out = json.loads(resp.read().decode())
    if isinstance(out, dict) and "error" in out:
        raise RuntimeError(out["error"])
    return out


def price(service, quantity):
    svc = next((s for s in call(action="services") if int(s["service"]) == int(service)), None)
    if not svc:
        raise ValueError(f"unknown service {service}")
    cost = round(float(svc["rate"]) * quantity / 1000, 4)
    return svc, cost


def main():
    services = call(action="services")
    print(f"{len(services)} services available. First: {services[0]['name']} "
          f"(${services[0]['rate']}/1000)")

    if not KEY:
        print("Set STARS_CASH_FLOW_API_KEY to see balance and place orders.")
        return

    print("Balance:", call(action="balance", key=KEY))

    svc, cost = price(service=1, quantity=1000)
    print(f"Order 1000 of '{svc['name']}' would cost ${cost:.4f}.")

    # --- spending happens only past an explicit human approval ---
    # if input("Place this order? [y/N] ").strip().lower() == "y":
    #     order = call(action="add", key=KEY, service=1,
    #                  link="https://t.me/mychannel", quantity=1000)
    #     print("Placed order:", order["order"])
    #     print("Status:", call(action="status", key=KEY, order=order["order"]))


if __name__ == "__main__":
    main()
