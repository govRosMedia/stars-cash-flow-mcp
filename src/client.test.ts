import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StarsCashFlowClient, StarsCashFlowError, Service } from "./client.js";

const BASE = "https://api.example.test/api/v2";

/** Build a fake fetch that records the last call and returns `payload`. */
function mockFetch(payload: unknown, status = 200) {
  const calls: { url: string; body: Record<string, string> }[] = [];
  const fn = vi.fn(async (url: string, init: any) => {
    const body: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(init.body as string)) body[k] = v;
    calls.push({ url, body });
    return {
      status,
      text: async () => JSON.stringify(payload),
    } as Response;
  });
  (globalThis as any).fetch = fn;
  return { fn, calls };
}

const SERVICE: Service = {
  service: 1,
  name: "Telegram Channel Subscribers (Task Exchange)",
  type: "Default",
  category: "Telegram / Subscribers",
  rate: "21.2500",
  min: "10",
  max: "10000",
  refill: false,
  cancel: true,
  description: "Subscribers via task exchange.",
  currency: "USD",
};

let originalFetch: typeof fetch;
beforeEach(() => {
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("StarsCashFlowClient", () => {
  it("listServices() needs no key and sends action=services", async () => {
    const { calls } = mockFetch([SERVICE]);
    const client = new StarsCashFlowClient({ baseUrl: BASE });
    const services = await client.listServices();
    expect(services).toEqual([SERVICE]);
    expect(calls[0].url).toBe(BASE);
    expect(calls[0].body).toEqual({ action: "services" });
  });

  it("getBalance() sends the key", async () => {
    const { calls } = mockFetch({ balance: "100.0000", currency: "USD" });
    const client = new StarsCashFlowClient({ baseUrl: BASE, apiKey: "k-123" });
    const bal = await client.getBalance();
    expect(bal.balance).toBe("100.0000");
    expect(calls[0].body).toEqual({ action: "balance", key: "k-123" });
  });

  it("throws a typed error when no key is configured", async () => {
    mockFetch({ balance: "0" });
    const client = new StarsCashFlowClient({ baseUrl: BASE });
    await expect(client.getBalance()).rejects.toBeInstanceOf(StarsCashFlowError);
  });

  it("addOrder() posts service/link/quantity and returns the order id", async () => {
    const { calls } = mockFetch({ order: 555 });
    const client = new StarsCashFlowClient({ baseUrl: BASE, apiKey: "k" });
    const res = await client.addOrder(1, "https://t.me/c", 1000);
    expect(res.order).toBe(555);
    expect(calls[0].body).toEqual({
      action: "add",
      key: "k",
      service: "1",
      link: "https://t.me/c",
      quantity: "1000",
    });
  });

  it("surfaces API { error } as a thrown StarsCashFlowError", async () => {
    mockFetch({ error: "Insufficient balance" });
    const client = new StarsCashFlowClient({ baseUrl: BASE, apiKey: "k" });
    await expect(client.addOrder(1, "x", 10)).rejects.toThrowError("Insufficient balance");
  });

  it("orderStatus() and multiStatus() build the right payloads", async () => {
    const single = mockFetch({ charge: "21.25", start_count: "0", status: "Pending", remains: "1000", currency: "USD" });
    const client = new StarsCashFlowClient({ baseUrl: BASE, apiKey: "k" });
    await client.orderStatus(42);
    expect(single.calls[0].body).toEqual({ action: "status", key: "k", order: "42" });

    const multi = mockFetch({ "1": {}, "2": {} });
    await client.multiStatus([1, 2, 3]);
    expect(multi.calls[0].body).toEqual({ action: "status", key: "k", orders: "1,2,3" });
  });

  it("cancelOrders() joins ids and returns the canceled list", async () => {
    const { calls } = mockFetch({ canceled: [1, 2] });
    const client = new StarsCashFlowClient({ baseUrl: BASE, apiKey: "k" });
    const res = await client.cancelOrders([1, 2, 3]);
    expect(res.canceled).toEqual([1, 2]);
    expect(calls[0].body).toEqual({ action: "cancel", key: "k", orders: "1,2,3" });
  });

  it("throws on non-JSON responses", async () => {
    const fn = vi.fn(async () => ({ status: 502, text: async () => "<html>Bad Gateway</html>" }) as Response);
    (globalThis as any).fetch = fn;
    const client = new StarsCashFlowClient({ baseUrl: BASE });
    await expect(client.listServices()).rejects.toBeInstanceOf(StarsCashFlowError);
  });

  it("cost() computes rate * quantity / 1000, rounded to 4 dp", () => {
    expect(StarsCashFlowClient.cost(SERVICE, 1000)).toBe(21.25);
    expect(StarsCashFlowClient.cost(SERVICE, 10)).toBe(0.2125);
    expect(StarsCashFlowClient.cost({ ...SERVICE, rate: "42.5000" }, 500)).toBe(21.25);
  });

  it("hasKey() reflects configuration", () => {
    expect(new StarsCashFlowClient({ baseUrl: BASE }).hasKey()).toBe(false);
    expect(new StarsCashFlowClient({ baseUrl: BASE, apiKey: "k" }).hasKey()).toBe(true);
  });
});
