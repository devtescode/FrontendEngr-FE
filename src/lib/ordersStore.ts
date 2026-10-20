
import { API_BASE_URL } from "./config";

const API_URL = API_BASE_URL;

// =====================================================
// SAFE COERCION & TYPE GUARDS
// =====================================================

const isObject = (v: unknown): v is Record<string, any> => {
  return !!v && typeof v === "object" && !Array.isArray(v);
};

const toStringSafe = (v: unknown, fallback = ""): string => {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (isObject(v)) {
    const obj = v as Record<string, any>;
    if (obj._id != null) return String(obj._id);
    if (obj.id != null) return String(obj.id);
    if (obj.uuid != null) return String(obj.uuid);
  }
  return String(v);
};

const toNumberSafe = (v: unknown, fallback = 0): number => {
  if (v == null) return fallback;
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : fallback;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return fallback;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  if (isObject(v)) {
    const obj = v as Record<string, any>;
    if ("amount" in obj) return toNumberSafe(obj.amount, fallback);
    if ("price" in obj) return toNumberSafe(obj.price, fallback);
    if ("value" in obj) return toNumberSafe(obj.value, fallback);
  }
  return fallback;
};

const toNullableString = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (isObject(v)) {
    const obj = v as Record<string, any>;
    if (obj.url != null) return toNullableString(obj.url);
    if (obj.src != null) return toNullableString(obj.src);
    if (obj.image != null) return toNullableString(obj.image);
  }
  return null;
};

const pickFirstObject = (obj: any, keys: string[]): any => {
  if (!isObject(obj)) return null;
  for (const k of keys) {
    if (obj[k] && isObject(obj[k])) return obj[k];
  }
  return null;
};

export type OrderItem = {
  componentId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  sku?: string | null;
};

export type Order = {
  id: string;
  reference: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: "Paid" | "Ready" | "Collected";
  channel: string | null;
  paidAt: string;
  createdAt: string;
  collectedAt?: string | null;
  itemCount?: number;
};

// =====================================================
// GLOBAL CACHE
// =====================================================
export let ordersCache: Order[] = [];
export let ordersLoaded = false;

// In-flight request guard — prevents duplicate fetches
// when multiple components mount at once.
let inflight: Promise<Order[]> | null = null;

export const setOrdersCache = (next: Order[]) => {
  ordersCache = next;
};

// =====================================================
// NORMALIZE ORDER
// =====================================================
// The backend may return `id`, `_id`, or both depending
// on the shape of its transform. This function produces
// a single canonical shape so downstream components
// can rely on `order.id` being a valid string.
//
function normalizeOrder(raw: any): Order {
  const source = isObject(raw) ? raw : {};

  const id = toStringSafe(source.id ?? source._id ?? source.orderId ?? source.uuid, "");

  const items: OrderItem[] = Array.isArray(source.items)
    ? source.items
        .map((it: any): OrderItem | null => {
          if (!isObject(it)) return null;

          const populated =
            it.componentId && isObject(it.componentId)
              ? it.componentId
              : pickFirstObject(it, ["component", "product", "item"]);

          const componentId = toStringSafe(
            populated?._id ?? populated?.id ?? it.componentId ?? it.componentId?._id,
            ""
          );
          if (!componentId) return null;

          const name = toStringSafe(it.name ?? populated?.name ?? "", "");
          const price = toNumberSafe(
            it.price ?? populated?.price ?? it.unitPrice ?? it.amount ?? 0,
            0
          );
          const quantity = toNumberSafe(it.quantity ?? it.qty ?? it.count ?? 0, 0);
          if (quantity <= 0) return null;

          const image =
            toNullableString(
              populated?.image ?? populated?.thumbnail ?? it.image ?? it.thumbnail
            ) ?? null;
          const sku = toNullableString(populated?.sku ?? it.sku ?? "") ?? null;

          return {
            componentId,
            name,
            price,
            quantity,
            image,
            sku,
          };
        })
        .filter((i): i is OrderItem => !!i)
    : [];

  const rawStatus = source.status ?? source.pickupStatus ?? source.paymentStatus;
  const status: Order["status"] =
    rawStatus === "Ready" || rawStatus === "Collected"
      ? rawStatus
      : "Paid";

  const totalFromItems = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const total = toNumberSafe(
    source.total ??
      source.amount ??
      source.amountNaira ??
      source.grandTotal ??
      source.amountDue ??
      totalFromItems,
    totalFromItems
  );

  const paidAtCandidate =
    source.paidAt ?? source.paid_at ?? source.createdAt ?? source.created_at ?? new Date().toISOString();
  const createdAtCandidate = source.createdAt ?? source.created_at ?? paidAtCandidate ?? "";

  const itemCount =
    typeof source.itemCount === "number" && Number.isFinite(source.itemCount)
      ? source.itemCount
      : items.reduce((s, it) => s + it.quantity, 0);

  return {
    id,
    reference: toStringSafe(source.reference ?? source.ref ?? source.orderReference ?? "", ""),
    items,
    total,
    currency: toStringSafe(source.currency ?? "NGN", "NGN"),
    status,
    channel: source.channel ?? source.paymentMethod ?? null,
    paidAt: toStringSafe(paidAtCandidate, new Date().toISOString()),
    createdAt: toStringSafe(createdAtCandidate, ""),
    collectedAt: source.collectedAt ?? source.collected_at ?? null,
    itemCount,
  };
}
// =====================================================
// LOAD ORDERS
// =====================================================
export const loadOrders = async (): Promise<Order[]> => {
  // Return cache if already loaded.
  if (ordersLoaded) return ordersCache;

  // Reuse in-flight request if one exists.
  if (inflight) return inflight;

  const token = sessionStorage.getItem("pulselab_token");
  if (!token) throw new Error("Please login first.");

  inflight = (async () => {
    try {
      const response = await fetch(
        `${API_URL}/engineering/getorders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(
          `Orders endpoint returned non-JSON (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load orders."
        );
      }

      // =================================================
      // NORMALIZE EVERY ORDER
      // =================================================
      // Guarantees `order.id` is always a non-empty
      // string. This prevents `/receipts/undefined`
      // URLs downstream.
      //
      const next: Order[] = Array.isArray(data?.orders)
        ? data.orders.map(normalizeOrder)
        : [];

      // Guard: log any orders that still lack an id.
      // (Should never happen after normalizeOrder, but
      // catches schema changes early.)
      const broken = next.filter((o) => !o.id);
      if (broken.length > 0) {
        console.warn(
          `⚠️ ${broken.length} order(s) missing an id:`,
          broken
        );
      }

      ordersCache = next;
      ordersLoaded = true;

      return next;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

// =====================================================
// RESET CACHE
// =====================================================
// Call this on logout, or when you want to force a
// fresh fetch (e.g., after a payment succeeds).
//
export const resetOrdersCache = () => {
  ordersCache = [];
  ordersLoaded = false;
  inflight = null;
};