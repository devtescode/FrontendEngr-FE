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
    if ("total" in obj) return toNumberSafe(obj.total, fallback);
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
    if (obj.thumbnail != null) return toNullableString(obj.thumbnail);
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

// =====================================================
// TYPES
// =====================================================

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

export type CartItem = {
  componentId: string | { _id: string; id?: string; [key: string]: any } | any;
  quantity: number;
  [key: string]: any;
};

export type Cart = {
  _id?: string;
  userId?: string;
  items: CartItem[];
  [key: string]: any;
};

export type DashboardOrdersResponse = {
  orders?: Order[] | any[];
  data?: Order[] | any[];
  [key: string]: any;
};

export type DashboardCartResponse = {
  cart?: Cart | any;
  items?: CartItem[] | any[];
  data?: Cart | any[] | any;
  [key: string]: any;
};

export type DashboardData = {
  orders: Order[];
  cart: Cart;
};

// =====================================================
// NORMALIZE FUNCTIONS
// =====================================================

export function normalizeOrder(raw: any): Order {
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
            populated?._id ?? populated?.id ?? it.componentId ?? (isObject(it.componentId) ? (it.componentId as any)._id : undefined),
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

export function extractCart(data: unknown): Cart {
  if (!data || typeof data !== "object") return { items: [] };
  const obj = data as Record<string, any>;

  if (Array.isArray(obj.items)) {
    return { ...obj, items: obj.items };
  }
  if (obj.cart && typeof obj.cart === "object" && Array.isArray((obj.cart as any).items)) {
    return { ...(obj.cart as any), items: (obj.cart as any).items };
  }
  if (Array.isArray(data)) {
    return { items: data as CartItem[] };
  }
  return { items: [] };
}

export function normalizeOrders(data: unknown): Order[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map((o: any) => normalizeOrder(o))
      .filter((o: Order) => o && o.id);
  }
  if (isObject(data)) {
    const obj = data as DashboardOrdersResponse;
    if (Array.isArray(obj.orders)) {
      return obj.orders
        .map((o: any) => normalizeOrder(o))
        .filter((o: Order) => o && o.id);
    }
    if (Array.isArray(obj.data)) {
      return obj.data
        .map((o: any) => normalizeOrder(o))
        .filter((o: Order) => o && o.id);
    }
  }
  return [];
}

// =====================================================
// TOKEN RETRIEVAL (with fallbacks)
// =====================================================

export function getDashboardToken(): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return (
      sessionStorage.getItem("pulselab_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      sessionStorage.getItem("access_token") ||
      null
    );
  } catch {
    return null;
  }
}

// =====================================================
// FETCH WITH TIMEOUT (mobile-friendly)
// =====================================================

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Request timed out after ${Math.round(ms / 1000)}s. Check your network connection.`
      );
    }
    // Network errors are common on mobile
    if (err instanceof TypeError) {
      throw new Error("Network error. Please check your connection.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =====================================================
// LOAD DASHBOARD DATA
// =====================================================

export async function fetchDashboardData(token?: string | null): Promise<DashboardData> {
  const authToken = token !== undefined ? token : getDashboardToken();
  if (!authToken) {
    throw new Error("Please login first.");
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };

  const [ordersRes, cartRes] = await Promise.allSettled([
    fetchWithTimeout(`${API_URL}/engineering/userordersdb`, {
      method: "GET",
      headers,
    }),
    fetchWithTimeout(`${API_URL}/engineering/cartuserdb`, {
      method: "GET",
      headers,
    }),
  ]);

  let ordersResOk: Response | null = null;
  let ordersText = "";
  if (ordersRes.status === "fulfilled") {
    ordersResOk = ordersRes.value;
    try {
      ordersText = await ordersResOk.text();
    } catch {
      ordersText = "";
    }
  }

  let cartResOk: Response | null = null;
  let cartText = "";
  if (cartRes.status === "fulfilled") {
    cartResOk = cartRes.value;
    try {
      cartText = await cartResOk.text();
    } catch {
      cartText = "";
    }
  }

  if (!ordersResOk || !ordersResOk.ok) {
    let ordersDataErr: any = null;
    try {
      ordersDataErr = ordersText ? JSON.parse(ordersText) : null;
    } catch {
      // ignore parse error
    }
    const status = ordersResOk?.status;
    throw new Error(
      ordersDataErr?.message ||
        (status ? `Unable to load orders (HTTP ${status}).` : "Unable to load orders.")
    );
  }

  if (!cartResOk || !cartResOk.ok) {
    let cartDataErr: any = null;
    try {
      cartDataErr = cartText ? JSON.parse(cartText) : null;
    } catch {
      // ignore parse error
    }
    const status = cartResOk?.status;
    throw new Error(
      cartDataErr?.message ||
        (status ? `Unable to load cart (HTTP ${status}).` : "Unable to load cart.")
    );
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

  const orders = normalizeOrders(ordersData);
  const cart = extractCart(cartData);

  // Ensure cart has items array
  if (!cart || !Array.isArray(cart.items)) {
    cart.items = [];
  }

  return {
    orders,
    cart,
  };
}
