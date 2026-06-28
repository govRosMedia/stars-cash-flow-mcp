#!/usr/bin/env node
// Stars Cash Flow API — Node walkthrough using the typed client.
//
// Usage (from the repo root, after `npm run build`):
//   STARS_CASH_FLOW_API_KEY=your-key node examples/node_example.mjs
//
// Demonstrates the safe flow: discover -> price -> (human approves) -> order.
// The order call is commented out so this script never spends by accident.

import { StarsCashFlowClient } from "../dist/client.js";

const client = new StarsCashFlowClient(); // reads STARS_CASH_FLOW_API_KEY / _BASE

const services = await client.listServices();
console.log(`${services.length} services. First: ${services[0].name} ($${services[0].rate}/1000)`);

if (!client.hasKey()) {
  console.log("Set STARS_CASH_FLOW_API_KEY to see balance and place orders.");
  process.exit(0);
}

const balance = await client.getBalance();
console.log("Balance:", balance.balance, balance.currency);

const svc = services.find((s) => s.service === 1);
const cost = StarsCashFlowClient.cost(svc, 1000);
console.log(`Order 1000 of '${svc.name}' would cost $${cost.toFixed(4)}.`);

// --- spending happens only past an explicit human approval ---
// const order = await client.addOrder(1, "https://t.me/mychannel", 1000);
// console.log("Placed order:", order.order);
// console.log("Status:", await client.orderStatus(order.order));
