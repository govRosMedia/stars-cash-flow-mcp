/**
 * Thin HTTP client over the Stars Cash Flow reseller API (`/api/v2`).
 *
 * The API is JustAnotherPanel / Perfect Panel compatible: a single endpoint
 * that dispatches on the `action` field. Everything except `services` requires
 * an API key tied to a USD balance. `add` spends that balance — treat it as a
 * money-write operation.
 */

export interface Service {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string; // USD per 1000
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
  description: string;
  currency: string; // "USD"
}

export interface Balance {
  balance: string;
  currency: string;
}

export interface OrderStatus {
  charge: string;
  start_count: string;
  status: string; // In progress | Partial | Completed | Pending | Canceled
  remains: string;
  currency: string;
}

export interface ApiError {
  error: string;
}

export class StarsCashFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StarsCashFlowError";
  }
}

export interface ClientOptions {
  /** Full endpoint, e.g. https://api-stars.ros.media/api/v2 */
  baseUrl?: string;
  /** Reseller API key. Required for everything except listServices(). */
  apiKey?: string;
  /** Per-request timeout, ms. */
  timeoutMs?: number;
}

const DEFAULT_BASE = "https://api-stars.ros.media/api/v2";

export class StarsCashFlowClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || process.env.STARS_CASH_FLOW_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
    this.apiKey = opts.apiKey ?? process.env.STARS_CASH_FLOW_API_KEY ?? undefined;
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  hasKey(): boolean {
    return Boolean(this.apiKey);
  }

  private requireKey(): string {
    if (!this.apiKey) {
      throw new StarsCashFlowError(
        "No API key configured. Set STARS_CASH_FLOW_API_KEY (get one from @StarsCashFlowbot → Reseller)."
      );
    }
    return this.apiKey;
  }

  private async call<T>(params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) body.set(k, String(v));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
        signal: ctrl.signal,
      });
    } catch (e: any) {
      throw new StarsCashFlowError(`Network error calling ${this.baseUrl}: ${e?.message || e}`);
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new StarsCashFlowError(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    if (data && typeof data === "object" && "error" in data) {
      throw new StarsCashFlowError(String((data as ApiError).error));
    }
    return data as T;
  }

  /** Public service catalog with live USD rates. No key needed. */
  listServices(): Promise<Service[]> {
    return this.call<Service[]>({ action: "services" });
  }

  /** USD balance of the configured key. */
  async getBalance(): Promise<Balance> {
    return this.call<Balance>({ action: "balance", key: this.requireKey() });
  }

  /**
   * Place an order. SPENDS the key's USD balance.
   * `link` is required for most services (channel/post/bot link).
   */
  async addOrder(service: number, link: string, quantity: number): Promise<{ order: number }> {
    return this.call<{ order: number }>({
      action: "add",
      key: this.requireKey(),
      service,
      link,
      quantity,
    });
  }

  /** Status of one order. */
  async orderStatus(order: number): Promise<OrderStatus> {
    return this.call<OrderStatus>({ action: "status", key: this.requireKey(), order });
  }

  /** Status of several orders (up to 100). Returns a map keyed by order id. */
  async multiStatus(orders: number[]): Promise<Record<string, OrderStatus>> {
    return this.call<Record<string, OrderStatus>>({
      action: "status",
      key: this.requireKey(),
      orders: orders.join(","),
    });
  }

  /** Cancel orders and refund the unfulfilled remainder to the key balance. */
  async cancelOrders(orders: number[]): Promise<{ canceled: number[] }> {
    return this.call<{ canceled: number[] }>({
      action: "cancel",
      key: this.requireKey(),
      orders: orders.join(","),
    });
  }

  /** Compute the USD cost of `quantity` units of a service from its live rate. */
  static cost(service: Service, quantity: number): number {
    const rate = parseFloat(service.rate);
    return Math.round((rate * quantity) / 1000 * 10000) / 10000;
  }
}
