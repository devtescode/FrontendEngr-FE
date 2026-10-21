/* ============================================================
   NORMALIZERS
   ------------------------------------------------------------
   The backend returns orders and carts in several shapes
   depending on the endpoint:

     • /engineering/getorders      -> { orders: [...] }
     • /engineering/userordersdb   -> { orders: [...] }
     • /engineering/orders/:id     -> { order: {...} }
     • /admin/overview             -> { orders: [...] } (kobo)
     • /admin/pickup/search        -> { orders: [...] }
     • /engineering/cart           -> bare cart document
     • /engineering/cartuserdb     -> { _id, userId, items }

   One normalizer per entity keeps every consumer working from
   the same shape, regardless of which endpoint produced it.
   ============================================================ */

export const isObj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export const safeStr = (v: unknown, fb = ""): string => {
  if (v == null) return fb;

  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint") return String(v);

  if (isObj(v)) {
    const obj = v as Record<string, any>;

    if (obj._id != null) return String(obj._id);
    if (obj.id != null) return String(obj.id);
  }

  return String(v);
};

export const safeNum = (v: unknown, fb = 0): number => {
  if (v == null) return fb;

  if (typeof v === "number") return Number.isFinite(v) ? v : fb;

  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : fb;
  }

  return fb;
};

export const safeNullStr = (v: unknown): string | null => {
  if (v == null) return null;

  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }

  if (typeof v === "number" || typeof v === "boolean") return String(v);

  if (isObj(v)) {
    const obj = v as Record<string, any>;

    if (obj.url != null) return safeNullStr(obj.url);
    if (obj.src != null) return safeNullStr(obj.src);
    if (obj.image != null) return safeNullStr(obj.image);
  }

  return null;
};

const pickObj = (obj: any, keys: string[]) => {
  if (!isObj(obj)) return null;

  for (const k of keys) {
    if (isObj(obj[k])) return obj[k];
  }

  return null;
};

/* ============================================================
   ORDERS
   ============================================================ */

export type NormalizedOrderItem = {
  componentId: string;
  name: string;
  /** unit price in naira */
  price: number;
  quantity: number;
  image: string | null;
  sku: string | null;
};

export type NormalizedOrderStatus = "Paid" | "Ready" | "Collected";

export type NormalizedOrder = {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  matric: string;
  email: string | null;

  items: NormalizedOrderItem[];
  /** convenience: sum of item quantities */
  itemCount: number;

  /** total in naira */
  total: number;
  /** raw amount in kobo (the server field is `amount`) */
  amountKobo: number;
  /** derived amount in naira */
  amountNaira: number;
  currency: string;

  /** derived pickup status */
  status: NormalizedOrderStatus;
  paymentStatus: string;
  pickupStatus: string | null;

  channel: string | null;
  paidAt: string;
  createdAt: string;
  collectedAt: string | null;

  /** present on the single-receipt endpoint */
  subtotal?: number;
  paystackTransactionId?: string | null;
  paystackFees?: number;
  customerEmail?: string | null;
};

export function normalizeOrderItem(raw: any): NormalizedOrderItem {
  if (!isObj(raw)) {
    return {
      componentId: "",
      name: "",
      price: 0,
      quantity: 0,
      image: null,
      sku: null,
    };
  }

  const populated =
    raw.componentId && isObj(raw.componentId)
      ? raw.componentId
      : pickObj(raw, ["component", "product", "item"]);

  const componentId = safeStr(
    populated?._id ?? populated?.id ?? raw.componentId ?? raw.componentId?._id,
    ""
  );

  return {
    componentId,
    name: safeStr(raw.name ?? populated?.name ?? "", ""),
    price: safeNum(raw.price ?? populated?.price ?? raw.unitPrice ?? 0, 0),
    quantity: safeNum(raw.quantity ?? raw.qty ?? raw.count ?? 0, 0),
    image:
      safeNullStr(populated?.image ?? populated?.thumbnail ?? raw.image) ?? null,
    sku: safeNullStr(populated?.sku ?? raw.sku ?? "") ?? null,
  };
}

export function normalizeOrder(raw: any): NormalizedOrder {
  const source = isObj(raw) ? raw : {};

  const items: NormalizedOrderItem[] = Array.isArray(source.items)
    ? source.items
        .map(normalizeOrderItem)
        .filter((i) => i.componentId !== "" && i.quantity > 0)
    : [];

  const totalFromItems = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  // The student endpoints return `total` in naira; the admin overview
  // returns `amount` in kobo.
  const explicitTotal = safeNum(source.total ?? source.amountNaira, 0);
  const amountKobo = Math.round(
    safeNum(source.amountKobo ?? source.amount ?? source.totalKobo, 0)
  );

  const total =
    explicitTotal > 0
      ? explicitTotal
      : amountKobo > 0
        ? amountKobo / 100
        : totalFromItems;

  const rawStatus =
    source.status ?? source.pickupStatus ?? source.paymentStatus;

  const status: NormalizedOrderStatus =
    rawStatus === "Ready" || rawStatus === "Collected" ? rawStatus : "Paid";

  const now = new Date().toISOString();

  return {
    id: safeStr(source.id ?? source._id ?? source.orderId ?? "", ""),
    reference: safeStr(source.reference ?? source.ref ?? "", ""),
    userId: safeStr(
      source.userId?._id ?? source.userId ?? source.buyerId ?? "",
      ""
    ),
    userName: safeStr(source.userName ?? source.userId?.fullName ?? "", ""),
    matric: safeStr(source.matric ?? source.userId?.matric ?? "", ""),
    email: safeNullStr(source.email ?? source.userId?.email ?? null),

    items,
    itemCount:
      typeof source.itemCount === "number" && Number.isFinite(source.itemCount)
        ? source.itemCount
        : items.reduce((sum, i) => sum + i.quantity, 0),

    total,
    amountKobo,
    amountNaira: amountKobo > 0 ? amountKobo / 100 : total,
    currency: safeStr(source.currency ?? "NGN", "NGN"),

    status,
    paymentStatus: safeStr(source.paymentStatus ?? "pending", "pending"),
    pickupStatus: safeNullStr(source.pickupStatus ?? null),

    channel: safeNullStr(source.channel ?? source.paymentMethod ?? null),
    paidAt: safeStr(source.paidAt ?? source.paystackPaidAt ?? source.createdAt ?? now, now),
    createdAt: safeStr(source.createdAt ?? source.created_at ?? now, now),
    collectedAt: safeNullStr(source.collectedAt ?? null),

    subtotal:
      typeof source.subtotal === "number"
        ? source.subtotal
        : totalFromItems,
    paystackTransactionId: safeNullStr(
      source.paystackTransactionId ?? null
    ),
    paystackFees: safeNum(source.paystackFees, 0),
    customerEmail: safeNullStr(
      source.customerEmail ?? source.paystackCustomer?.email ?? null
    ),
  };
}

/** Pulls the order array out of any of the shapes the API returns. */
export function extractOrders(raw: unknown): NormalizedOrder[] {
  if (Array.isArray(raw)) return raw.map(normalizeOrder);

  if (isObj(raw)) {
    if (Array.isArray((raw as any).orders)) {
      return (raw as any).orders.map(normalizeOrder);
    }

    if (Array.isArray((raw as any).data)) {
      return (raw as any).data.map(normalizeOrder);
    }

    if (Array.isArray((raw as any).order)) {
      return (raw as any).order.map(normalizeOrder);
    }
  }

  return [];
}

/* ============================================================
   CART
   ============================================================ */

export type NormalizedCartItem = {
  componentId: string;
  quantity: number;
  /** populated component, when the server sends one */
  component: Record<string, any> | null;
};

export type NormalizedCart = {
  id: string;
  userId: string;
  items: NormalizedCartItem[];
  totalQuantity: number;
};

export function normalizeCart(raw: unknown): NormalizedCart {
  const source = isObj(raw) ? raw : {};

  const rawItems = Array.isArray((source as any).items)
    ? ((source as any).items as any[])
    : Array.isArray(raw)
      ? (raw as any[])
      : [];

  const items: NormalizedCartItem[] = [];

  for (const entry of rawItems) {
    if (!isObj(entry)) continue;

    const rawComponent = entry.componentId;
    const isPopulated = isObj(rawComponent);

    const componentId = isPopulated
      ? safeStr(
          rawComponent._id ?? rawComponent.id ?? rawComponent.componentId,
          ""
        )
      : safeStr(rawComponent, "");

    if (!componentId) continue;

    const quantity = safeNum(entry.quantity ?? entry.qty ?? entry.count, 0);

    if (quantity <= 0) continue;

    items.push({
      componentId,
      quantity,
      component: isPopulated ? (rawComponent as Record<string, any>) : null,
    });
  }

  return {
    id: safeStr(source._id ?? source.id ?? "", ""),
    userId: safeStr(source.userId ?? "", ""),
    items,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

/** Pulls the cart document out of any of the shapes the API returns. */
export function extractCart(raw: unknown): NormalizedCart {
  if (isObj(raw) && isObj((raw as any).cart)) {
    return normalizeCart((raw as any).cart);
  }

  return normalizeCart(raw);
}
