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
        throw new Error(data?.message || "Unable to load orders.");
      }

      const next: Order[] = Array.isArray(data?.orders)
        ? data.orders
        : [];

      ordersCache = next;
      ordersLoaded = true;

      return next;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};