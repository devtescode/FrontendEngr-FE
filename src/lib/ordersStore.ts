// const API_URL =
//   import.meta.env.VITE_API_URL || "http://localhost:4500";

// export type OrderItem = {
//   componentId: string;
//   name: string;
//   price: number;
//   quantity: number;
//   image?: string | null;
//   sku?: string | null;
// };

// export type Order = {
//   id: string;
//   reference: string;
//   items: OrderItem[];
//   total: number;
//   currency: string;
//   status: "Paid";
//   channel: string | null;
//   paidAt: string;
//   createdAt: string;
// };

// // =====================================================
// // GLOBAL CACHE
// // =====================================================
// export let ordersCache: Order[] = [];
// export let ordersLoaded = false;

// // In-flight request guard — prevents duplicate fetches
// // when multiple components mount at once.
// let inflight: Promise<Order[]> | null = null;

// export const setOrdersCache = (next: Order[]) => {
//   ordersCache = next;
// };

// export const loadOrders = async (): Promise<Order[]> => {
//   // Return cache if already loaded.
//   if (ordersLoaded) return ordersCache;

//   // Reuse in-flight request if one exists.
//   if (inflight) return inflight;

//   const token = sessionStorage.getItem("pulselab_token");
//   if (!token) throw new Error("Please login first.");

//   inflight = (async () => {
//     try {
//       const response = await fetch(
//         `${API_URL}/engineering/getorders`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       const rawText = await response.text();
//       let data: any = null;
//       try {
//         data = rawText ? JSON.parse(rawText) : null;
//       } catch {
//         throw new Error(
//           `Orders endpoint returned non-JSON (HTTP ${response.status}).`
//         );
//       }

//       if (!response.ok) {
//         throw new Error(data?.message || "Unable to load orders.");
//       }

//       const next: Order[] = Array.isArray(data?.orders)
//         ? data.orders
//         : [];

//       ordersCache = next;
//       ordersLoaded = true;

//       return next;
//     } finally {
//       inflight = null;
//     }
//   })();

//   return inflight;
// };
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

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
  status: "Paid";
  channel: string | null;
  paidAt: string;
  createdAt: string;
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
  // Pick the first available id field. Coerce to string
  // so JSON-serialized ObjectIds (which are strings
  // anyway) and raw ObjectId instances both work.
  const id = String(raw?.id ?? raw?._id ?? "");

  const items: OrderItem[] = Array.isArray(raw?.items)
    ? raw.items.map((it: any) => {
        // `componentId` can be either a populated object
        // or a plain string depending on whether the
        // backend used `.populate()`.
        const populated =
          it?.componentId && typeof it.componentId === "object"
            ? it.componentId
            : null;

        return {
          componentId: String(
            populated?._id ?? it?.componentId ?? ""
          ),
          name: String(it?.name ?? ""),
          price: Number(it?.price ?? 0),
          quantity: Number(it?.quantity ?? 0),
          image: populated?.image ?? it?.image ?? null,
          sku: populated?.sku ?? it?.sku ?? null,
        };
      })
    : [];

  return {
    id,
    reference: String(raw?.reference ?? ""),
    items,
    total: Number(raw?.total ?? 0),
    currency: String(raw?.currency ?? "NGN"),
    status: "Paid",
    channel: raw?.channel ?? null,
    paidAt: String(
      raw?.paidAt ?? raw?.createdAt ?? new Date().toISOString()
    ),
    createdAt: String(raw?.createdAt ?? ""),
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