#!/usr/bin/env node
/**
 * Stars Cash Flow — MCP server.
 *
 * Exposes the reseller SMM API (`/api/v2`) to MCP hosts (Claude Desktop,
 * Claude Code, any MCP client) as five tools. `create_order` and
 * `cancel_order` are money-write: ordering spends the key's USD balance.
 *
 * Money safety: `create_order` is two-step. The first call returns a cost
 * estimate and refuses to place the order; it only submits when called again
 * with `confirm: true`. This forces the cost into the conversation before any
 * spend happens.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StarsCashFlowClient, StarsCashFlowError, Service } from "./client.js";

const client = new StarsCashFlowClient();

const server = new McpServer({
  name: "stars-cash-flow",
  version: "0.1.0",
});

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function fail(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}
function wrap<T>(fn: () => Promise<T>) {
  return fn().then(ok).catch((e) =>
    fail(e instanceof StarsCashFlowError ? e.message : `Unexpected error: ${e?.message || e}`)
  );
}

server.registerTool(
  "list_services",
  {
    title: "List services",
    description:
      "List the Stars Cash Flow service catalog with live USD rates (per 1000), min/max quantity and whether each service needs a link. No API key required. Use this to discover service IDs and price an order before calling create_order.",
    inputSchema: {},
  },
  () => wrap(() => client.listServices())
);

server.registerTool(
  "get_balance",
  {
    title: "Get balance",
    description: "Get the remaining USD balance of the configured reseller API key.",
    inputSchema: {},
  },
  () => wrap(() => client.getBalance())
);

server.registerTool(
  "create_order",
  {
    title: "Create order (spends balance)",
    description:
      "Place a Stars Cash Flow order. THIS SPENDS the key's USD balance. Two-step by design: call without `confirm` (or confirm=false) to get a cost estimate and validation; call again with confirm=true to actually place the order. `link` is the target channel/post/bot link (required for most services).",
    inputSchema: {
      service: z.number().int().describe("Service ID from list_services"),
      link: z
        .string()
        .optional()
        .describe("Target link (channel/post/bot). Required for most services; the API rejects the order if a required link is missing."),
      quantity: z.number().int().positive().describe("Quantity of units to order"),
      confirm: z
        .boolean()
        .optional()
        .describe("Must be true to actually place the order and spend balance. Omit/false = estimate only."),
    },
  },
  async ({ service, link, quantity, confirm }) => {
    try {
      const services = await client.listServices();
      const svc = services.find((s) => s.service === service);
      if (!svc) return fail(`Unknown service ID ${service}. Call list_services for valid IDs.`);

      const min = parseInt(svc.min, 10);
      const max = parseInt(svc.max, 10);
      if (quantity < min || quantity > max)
        return fail(`Quantity ${quantity} out of range for "${svc.name}" (min ${min}, max ${max}).`);

      const cost = StarsCashFlowClient.cost(svc, quantity);

      if (!confirm) {
        let balance: string | undefined;
        try {
          if (client.hasKey()) balance = (await client.getBalance()).balance;
        } catch {
          /* balance is best-effort in the estimate */
        }
        return ok({
          requires_confirmation: true,
          message: `This will place an order and spend $${cost.toFixed(4)}. Review, then call create_order again with confirm=true to proceed.`,
          estimate: {
            service_id: svc.service,
            service_name: svc.name,
            link,
            quantity,
            rate_per_1000_usd: svc.rate,
            cost_usd: cost.toFixed(4),
            ...(balance !== undefined ? { current_balance_usd: balance } : {}),
          },
        });
      }

      const result = await client.addOrder(service, link ?? "", quantity);
      // `estimated_cost_usd` is from the catalog rate at quote time; the authoritative
      // charge is on the order itself — read it back with order_status.
      return ok({ placed: true, order: result.order, estimated_cost_usd: cost.toFixed(4), service_name: svc.name });
    } catch (e: any) {
      return fail(e instanceof StarsCashFlowError ? e.message : `Unexpected error: ${e?.message || e}`);
    }
  }
);

server.registerTool(
  "order_status",
  {
    title: "Order status",
    description:
      "Get the status of one or more orders. Pass a single `order` or a list of `orders` (up to 100). Returns charge, start_count, status, remains.",
    inputSchema: {
      order: z.number().int().optional().describe("Single order ID"),
      orders: z.array(z.number().int()).optional().describe("Multiple order IDs (up to 100)"),
    },
  },
  async ({ order, orders }) => {
    if (orders && orders.length) return wrap(() => client.multiStatus(orders.slice(0, 100)));
    if (typeof order === "number") return wrap(() => client.orderStatus(order));
    return fail("Provide `order` (single) or `orders` (array).");
  }
);

server.registerTool(
  "cancel_order",
  {
    title: "Cancel order (refunds remainder)",
    description:
      "Cancel one or more orders. The unfulfilled remainder is refunded to the key's USD balance — this changes money state. Two-step by design: call without `confirm` to see what would be cancelled; call again with confirm=true to actually cancel.",
    inputSchema: {
      orders: z.array(z.number().int()).min(1).describe("Order IDs to cancel"),
      confirm: z
        .boolean()
        .optional()
        .describe("Must be true to actually cancel and refund. Omit/false = preview only."),
    },
  },
  async ({ orders, confirm }) => {
    if (!confirm) {
      let current_status: Record<string, unknown> | undefined;
      try {
        current_status = await client.multiStatus(orders.slice(0, 100));
      } catch {
        /* preview status is best-effort */
      }
      return ok({
        requires_confirmation: true,
        message: `This will cancel ${orders.length} order(s) and refund the unfulfilled remainder to your balance. Review, then call cancel_order again with confirm=true to proceed.`,
        orders,
        ...(current_status ? { current_status } : {}),
      });
    }
    return wrap(() => client.cancelOrders(orders));
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP channel.
  console.error("stars-cash-flow MCP server running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
