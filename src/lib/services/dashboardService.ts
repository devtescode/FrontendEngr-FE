import { API_BASE_URL } from "@/lib/config";

const API_URL = API_BASE_URL;

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

export type Cart = {
  _id?: string;
  userId?: string;
  items: {
    componentId: string | { _id: string; id?: string } | any;
    quantity: number;
  }[];
};

export type DashboardData = {
  orders: Order[];
  cart: Cart;
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const isObjDash = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const toStr = (v: unknown, fb = "") => {
  if (v == null) return fb;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (isObjDash(v)) {
    if (v._id != null) return String(v._id);
    if (v.id != null) return String(v.id);
  }
  return String(v);
};

const toNum = (v: unknown, fb = 0) => {
  if (v == null) return fb;
  if (typeof v === "number") return Number.isFinite(v) ? v : fb;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
};

const toNullStr = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (isObjDash(v)) {
    if (v.url != null) return toNullStr(v.url);
    if (v.src != null) return toNullStr(v.src);
    if (v.image != null) return toNullStr(v.image);
  }
  return null;
};

const pickObjDash = (obj: any, keys: string[]) => {
  if (!isObjDash(obj)) return null;
  for (const k of keys) {
    if (isObjDash(obj[k])) return obj[k];
  }
  return null;
};

// =====================================================
// FETCH WITH TIMEOUT
// =====================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Request timed out after ${ms / 1000}s. Check your backend.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// =====================================================
// NORMALIZE ORDER
// =====================================================

function normalizeOrder(raw: any): Order {
  const source = isObjDash(raw) ? raw : {};

  const id = toStr(source.id ?? source._id ?? source.orderId ?? source.uuid, "");

  const items: OrderItem[] = Array.isArray(source.items)
    ? source.items
        .map((it: any): OrderItem | null => {
          if (!isObjDash(it)) return null;

          const populated =
            it.componentId && isObjDash(it.componentId)
              ? it.componentId
              : pickObjDash(it, ["component", "product", "item"]);

          const componentId = toStr(
            populated?._id ?? populated?.id ?? it.componentId ?? it.componentId?._id,
            ""
          );
          if (!componentId) return null;

          const name = toStr(it.name ?? populated?.name ?? "", "");
          const price = toNum(it.price ?? populated?.price ?? it.unitPrice ?? it.amount ?? 0, 0);
          const quantity = toNum(it.quantity ?? it.qty ?? it.count ?? 0, 0);
          if (quantity <= 0) return null;

          const image = toNullStr(populated?.image ?? populated?.thumbnail ?? it.image ?? it.thumbnail) ?? null;
          const sku = toNullStr(populated?.sku ?? it.sku ?? "") ?? null;

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
  const total = toNum(source.total ?? source.amount ?? source.amountNaira ?? source.grandTotal ?? source.amountDue ?? totalFromItems, totalFromItems);

  const paidAtCandidate =
    source.paidAt ?? source.paid_at ?? source.createdAt ?? source.created_at ?? new Date().toISOString();
  const createdAtCandidate = source.createdAt ?? source.created_at ?? paidAtCandidate ?? "";

  const itemCount =
    typeof source.itemCount === "number" && Number.isFinite(source.itemCount)
      ? source.itemCount
      : items.reduce((s, it) => s + it.quantity, 0);

  return {
    id,
    reference: toStr(source.reference ?? source.ref ?? source.orderReference ?? "", ""),
    items,
    total,
    currency: toStr(source.currency ?? "NGN", "NGN"),
    status,
    channel: source.channel ?? source.paymentMethod ?? null,
    paidAt: toStr(paidAtCandidate, new Date().toISOString()),
    createdAt: toStr(createdAtCandidate, ""),
    collectedAt: source.collectedAt ?? source.collected_at ?? null,
    itemCount,
  };
}

const extractCart = (data: any): Cart => {
  if (!data || typeof data !== "object") return { items: [] };
  if (Array.isArray(data.items)) {
    return { ...data, items: data.items };
  }
  if (data.cart && Array.isArray(data.cart.items)) {
    return { ...data.cart, items: data.cart.items };
  }
  if (Array.isArray(data)) {
    return { items: data };
  }
  return { items: [] };
};

// =====================================================
// AUTH HELPER
// =====================================================

function getAuthToken(): string | null {
  try {
    return (
      sessionStorage.getItem("pulselab_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      null
    );
  } catch {
    return null;
  }
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

export async function fetchDashboardData(): Promise<DashboardData> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login first.");
  }

  const [ordersRes, cartRes] = await Promise.allSettled([
    fetchWithTimeout(`${API_URL}/engineering/userordersdb`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetchWithTimeout(`${API_URL}/engineering/cartuserdb`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  let ordersResOk: Response | null = null;
  let ordersText: string = "";
  if (ordersRes.status === "fulfilled") {
    ordersResOk = ordersRes.value;
    ordersText = await ordersResOk.text();
  }

  let cartResOk: Response | null = null;
  let cartText: string = "";
  if (cartRes.status === "fulfilled") {
    cartResOk = cartRes.value;
    cartText = await cartResOk.text();
  }

  if (!ordersResOk || !ordersResOk.ok) {
    let ordersDataErr: any = null;
    try {
      ordersDataErr = ordersText ? JSON.parse(ordersText) : null;
    } catch {
      // ignore parse error for non-OK response
    }
    throw new Error(ordersDataErr?.message || "Unable to load orders.");
  }

  if (!cartResOk || !cartResOk.ok) {
    let cartDataErr: any = null;
    try {
      cartDataErr = cartText ? JSON.parse(cartText) : null;
    } catch {
      // ignore parse error for non-OK response
    }
    throw new Error(cartDataErr?.message || "Unable to load cart.");
  }

  let ordersData: any = null;
  try {
    ordersData = ordersText ? JSON.parse(ordersText) : null;
  } catch {
    throw new Error(
      `Orders endpoint returned non-JSON (HTTP ${ordersResOk.status}).`
    );
  }

  let cartData: any = null;
  try {
    cartData = cartText ? JSON.parse(cartText) : null;
  } catch {
    throw new Error(
      `Cart endpoint returned non-JSON (HTTP ${cartResOk.status}).`
    );
  }

  let nextOrders: Order[] = [];
  if (Array.isArray(ordersData?.orders)) {
    nextOrders = ordersData.orders
      .map((o: any) => normalizeOrder(o))
      .filter((o: any) => o && o.id);
  } else if (Array.isArray(ordersData)) {
    nextOrders = ordersData
      .map((o: any) => normalizeOrder(o))
      .filter((o: any) => o && o.id);
  } else if (Array.isArray(ordersData?.data)) {
    nextOrders = ordersData.data
      .map((o: any) => normalizeOrder(o))
      .filter((o: any) => o && o.id);
  }

  const nextCart: Cart = extractCart(cartData);

  return {
    orders: Array.isArray(nextOrders) ? nextOrders : [],
    cart: nextCart && Array.isArray(nextCart.items) ? nextCart : { items: [] },
  };
}

// Backwards compatible alias
export const fetchDashboard = fetchDashboardData;
export const getDashboardData = fetchDashboardData;
