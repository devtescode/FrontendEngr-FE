import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  Bell,
  ClipboardList,
  AlertCircle,
  PackageCheck,
  Calendar,
  Check,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { formatNaira, useCurrentUser } from "@/lib/store";
import { socket, connectUserSocket } from "@/lib/socket";

import { API_BASE_URL } from "@/lib/config";
const API_URL = API_BASE_URL;

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — PulseLab" }],
  }),
  component: () => (
    <RequireAuth role="student">
      <DashboardPage />
    </RequireAuth>
  ),
});

// =====================================================
// TYPES
// =====================================================

const isObjDash = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
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

type OrderItem = {
  componentId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  sku?: string | null;
};

type Order = {
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

type Cart = {
  _id?: string;
  userId?: string;
  items: {
    componentId: string | { _id: string; id?: string } | any;
    quantity: number;
  }[];
};

// =====================================================
// MODULE-LEVEL CACHE
// =====================================================

let ordersCache: Order[] = [];
let cartCache: Cart = { items: [] };
let dashboardLoaded = false;

let inflight: Promise<void> | null = null;

export const resetDashboardCache = () => {
  ordersCache = [];
  cartCache = { items: [] };
  dashboardLoaded = false;
  inflight = null;
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

// =====================================================
// LOAD DATA (silent, cached)
// =====================================================

async function loadDashboardData(): Promise<void> {
  if (inflight) return inflight;

  let token: string | null = null;
  try {
    token =
      sessionStorage.getItem("pulselab_token") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      null;
  } catch {
    token = null;
  }
  if (!token) {
    throw new Error("Please login first.");
  }

  inflight = (async () => {
    try {
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

      const nextCart: Cart = extractCart(cartData);

      ordersCache = Array.isArray(nextOrders) ? nextOrders : [];
      cartCache = nextCart && Array.isArray(nextCart.items) ? nextCart : { items: [] };
      dashboardLoaded = true;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// =====================================================
// HELPERS
// =====================================================

const formatShortDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatFullDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// =====================================================
// PAGE
// =====================================================

function DashboardPage() {
  const user = useCurrentUser();

  const [orders, setOrders] = useState<Order[]>(() => Array.isArray(ordersCache) ? ordersCache : []);
  const [cart, setCart] = useState<Cart>(() => cartCache && Array.isArray(cartCache.items) ? cartCache : { items: [] });
  const [loading, setLoading] = useState(
    () => !dashboardLoaded && (Array.isArray(ordersCache) ? ordersCache.length === 0 : true)
  );
  const [error, setError] = useState<string | null>(null);

  const getToken = () => {
    try {
      return sessionStorage.getItem("pulselab_token") || sessionStorage.getItem("token") || null;
    } catch {
      return null;
    }
  };

  // ===================================================
  // INITIAL LOAD (silent)
  // ===================================================
  useEffect(() => {
    let mounted = true;

    const isFirstLoad = !dashboardLoaded;

    if (isFirstLoad) {
      setLoading(true);
      setError(null);
    }

    loadDashboardData()
      .then(() => {
        if (!mounted) return;
        setOrders(Array.isArray(ordersCache) ? ordersCache : []);
        setCart(cartCache && Array.isArray(cartCache.items) ? cartCache : { items: [] });
      })
      .catch((err: any) => {
        if (!mounted) return;
        const hasCachedOrders = Array.isArray(ordersCache) && ordersCache.length > 0;
        const hasCachedCart = cartCache && Array.isArray(cartCache.items) && cartCache.items.length > 0;
        if (!hasCachedOrders && !hasCachedCart) {
          setError(err?.message || "Failed to load dashboard data.");
        } else {
          console.error("Silent dashboard refresh failed:", err);
        }
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ===================================================
  // REAL-TIME UPDATES (silent)
  // ===================================================
  useEffect(() => {
    let mounted = true;
    const token = getToken();
    if (!token) return;

    const cleanupJoin = connectUserSocket();

    const refresh = async () => {
      try {
        await loadDashboardData();
        if (!mounted) return;
        setOrders(Array.isArray(ordersCache) ? ordersCache : []);
        setCart(cartCache && Array.isArray(cartCache.items) ? cartCache : { items: [] });
      } catch (e) {
        console.error("Dashboard refresh failed:", e);
      }
    };

    const onOrdersUpdated = () => {
      console.log("🟢 dashboard: orders:updated");
      refresh();
    };

    const onCartUpdated = () => {
      console.log("🟢 dashboard: cart:updated");
      refresh();
    };

    socket.on("orders:updated", onOrdersUpdated);
    socket.on("cart:updated", onCartUpdated);

    return () => {
      mounted = false;
      cleanupJoin();
      socket.off("orders:updated", onOrdersUpdated);
      socket.off("cart:updated", onCartUpdated);
    };
  }, []);

  // ===================================================
  // DERIVED
  // ===================================================
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCart = cart && Array.isArray(cart.items) ? cart : { items: [] };

  const active = useMemo(
    () => safeOrders.filter((o: any) => o && o.status !== "Collected"),
    [safeOrders]
  );

  const collected = useMemo(
    () => safeOrders.filter((o: any) => o && o.status === "Collected"),
    [safeOrders]
  );

  const cartCount = useMemo(() => {
    if (!Array.isArray(safeCart.items)) return 0;
    return safeCart.items.reduce((a, c: any) => {
      const q = Number(c?.quantity ?? c?.qty ?? 0);
      return a + (Number.isFinite(q) ? q : 0);
    }, 0);
  }, [safeCart]);

  // ===================================================
  // USER NOT LOADED YET
  // ===================================================
  if (!user) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  // ===================================================
  // LOADING — ONLY ON FIRST LOAD (no cache)
  // ===================================================
  if (loading && orders.length === 0) {
    return (
      <AppShell>
        <div
          className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 lg:py-12"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="pointer-events-none select-none">
            <div className="blur-[2px] opacity-70">
              {/* HEADER SKELETON */}
              <div className="mb-6 min-w-0 sm:mb-10">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200 sm:w-28" />
                <div className="mt-3 h-7 w-44 animate-pulse rounded bg-slate-200 sm:h-8 sm:w-56" />
                <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-200 sm:w-40" />
              </div>

              {/* STATS SKELETON */}
              <div className="mb-10 grid grid-cols-2 gap-3 sm:mb-12 sm:gap-4 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                  >
                    <div className="mb-3 size-8 animate-pulse rounded-lg bg-slate-200 sm:size-9" />
                    <div className="h-6 w-12 animate-pulse rounded bg-slate-200 sm:h-8 sm:w-16" />
                    <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-slate-200 sm:w-24" />
                  </div>
                ))}
              </div>

              {/* MAIN GRID SKELETON */}
              <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-lg sm:space-y-6 lg:grid lg:max-w-none lg:grid-cols-3 lg:space-y-0 lg:gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-2">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="h-5 w-28 animate-pulse rounded bg-slate-200 sm:w-32" />
                    <div className="h-4 w-14 animate-pulse rounded bg-slate-200 sm:w-16" />
                  </div>

                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200 sm:w-48" />
                          <div className="h-3 w-28 animate-pulse rounded bg-slate-200 sm:w-32" />
                        </div>
                        <div className="h-5 w-12 animate-pulse rounded bg-slate-200 sm:w-14" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="mb-6 h-5 w-28 animate-pulse rounded bg-slate-200 sm:w-32" />

                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-lg bg-slate-50 p-3"
                      >
                        <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200 sm:w-32" />
                        <div className="h-3 w-36 animate-pulse rounded bg-slate-200 sm:w-40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-slate-400 sm:text-xs">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================
  if (error) {
    return (
      <AppShell>
        <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 lg:py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
            <AlertCircle className="mx-auto mb-3 size-7 text-red-600 sm:size-8" />
            <p className="font-semibold text-red-700 sm:text-base">
              Couldn't load your dashboard
            </p>
            <p className="mt-1 text-xs text-red-600 sm:text-sm">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <AppShell>
      <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10 lg:py-12">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 min-w-0 sm:mb-10"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400 sm:text-[13px]">
            Welcome back
          </p>

          <h1 className="mt-1 break-words text-2xl font-bold leading-tight text-brand-navy sm:text-3xl">
            {user.fullName}
          </h1>

          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Matric ·{" "}
            <span className="font-mono">{user.matric}</span>
          </p>
        </motion.div>

        {/* STATS */}
        <div className="mb-7 grid min-w-0 w-full max-w-full overflow-visible grid-cols-2 gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 sm:mb-10 lg:mb-12 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Active Orders"
            value={active.length}
          />
          <StatCard
            icon={Package}
            label="Total Orders"
            value={safeOrders.length}
          />
          <StatCard
            icon={ShoppingCart}
            label="Cart Items"
            value={cartCount}
          />
          <StatCard
            icon={Bell}
            label="Unread Alerts"
            value={0}
            highlight
          />
        </div>

        {/* MAIN GRID */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* ACTIVE ORDERS */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 lg:col-span-2 lg:p-6"
          >
            {/* HEADER */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-brand-navy sm:text-lg">
                  Active orders
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Your last 3 orders ready for pickup
                </p>
              </div>

              <Link
                to="/orders"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-accent transition hover:gap-2 sm:text-sm"
              >
                View all
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* LIST */}
            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center sm:px-6 sm:py-12">
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-white shadow-sm sm:size-12">
                  <Package className="size-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  No active orders
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your paid orders will appear here.
                </p>
                <Link
                  to="/components"
                  className="mt-4 inline-block rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Browse components
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {active.slice(0, 3).map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-brand-navy/30 hover:shadow-md sm:p-4"
                  >
                    {/* TOP ROW — IMAGES + REFERENCE + TOTAL */}
                    <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap">
                      {/* IMAGE STACK */}
                      <div className="flex shrink-0 -space-x-3">
                        {o.items.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className="grid size-10 place-items-center overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-sm sm:size-11"
                            style={{ zIndex: 10 - idx }}
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="size-4 text-slate-400" />
                            )}
                          </div>
                        ))}
                        {o.items.length > 2 && (
                          <div className="grid size-10 place-items-center rounded-lg border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600 shadow-sm sm:size-11">
                            +{o.items.length - 2}
                          </div>
                        )}
                      </div>

                      {/* REFERENCE + STATUS */}
                      <div className="min-w-0 flex-1 basis-24">
                        <StatusPill status={o.status} />
                        <div className="mt-1.5 truncate font-mono text-[11px] text-slate-500 sm:text-xs">
                          {o.reference}
                        </div>
                      </div>

                      {/* TOTAL — stacked vertically on mobile */}
                      <div className="ml-auto min-w-0 shrink-0 text-right">
                        <div className="text-sm font-bold text-brand-navy sm:text-base">
                          {formatNaira(o.total)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                          {o.items.length} item
                          {o.items.length > 1 && "s"}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW — PAID DATE + PICKUP HINT */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                        <Calendar className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          Paid {formatShortDate(o.paidAt)}
                        </span>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-600 sm:text-xs">
                        <PackageCheck className="size-3.5" />
                        Ready for pickup
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* RECENT COLLECTED */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 lg:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-brand-navy sm:text-lg">
                  Recent collected
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Your last 3 pickups
                </p>
              </div>

              {collected.length > 0 && (
                <Link
                  to="/orders"
                  className="shrink-0 text-xs font-semibold text-brand-accent sm:text-sm"
                >
                  View all →
                </Link>
              )}
            </div>

            {collected.length === 0 ? (
              <div className="py-8 text-center sm:py-10">
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-slate-100 sm:size-12">
                  <PackageCheck className="size-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">
                  Nothing collected yet.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Pickups will show up here once you collect them.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {collected.slice(0, 3).map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="group min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                  >
                    {/* TOP ROW */}
                    <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap">
                      {/* IMAGE STACK */}
                      <div className="flex shrink-0 -space-x-3">
                        {o.items.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className="grid size-9 place-items-center overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-sm sm:size-10"
                            style={{ zIndex: 10 - idx }}
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover grayscale"
                              />
                            ) : (
                              <Package className="size-4 text-slate-400" />
                            )}
                          </div>
                        ))}
                        {o.items.length > 2 && (
                          <div className="grid size-9 place-items-center rounded-lg border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600 shadow-sm sm:size-10">
                            +{o.items.length - 2}
                          </div>
                        )}
                      </div>

                      {/* REFERENCE + STATUS */}
                      <div className="min-w-0 flex-1 basis-24">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200/60">
                          <Check className="size-3" />
                          Collected
                        </span>
                        <div className="mt-1.5 truncate font-mono text-[11px] text-slate-600 sm:text-xs">
                          {o.reference}
                        </div>
                      </div>

                      {/* AMOUNT */}
                      <div className="ml-auto min-w-0 shrink-0 text-right">
                        <div className="text-sm font-bold text-brand-navy sm:text-base">
                          {formatNaira(o.total)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                          Paid
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW — DATES */}
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                        <Calendar className="size-3 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest text-slate-400">
                            Paid
                          </div>
                          <div className="truncate text-slate-600">
                            {formatShortDate(o.paidAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                        <PackageCheck className="size-3 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest text-slate-400">
                            Collected
                          </div>
                          <div className="truncate text-slate-600">
                            {o.collectedAt
                              ? formatShortDate(o.collectedAt)
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------- STAT CARD ---------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: number | string | null | undefined;
  highlight?: boolean;
}) {
  const safeValue =
    typeof value === "number" && !isNaN(value)
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : 0;

  const numericValue =
    typeof safeValue === "number"
      ? safeValue
      : Number(safeValue) || 0;

  const displayValue = String(safeValue);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`min-w-0 w-full max-w-full overflow-visible rounded-2xl border p-2 sm:p-3 md:p-4 lg:p-5 ${
        highlight
          ? "border-transparent bg-brand-navy text-white"
          : "border-slate-200 bg-white"
      }`}
      title={displayValue}
      data-debug-value={displayValue}
      aria-label={`${label}: ${displayValue}`}
    >
      <div
        className={`mb-1.5 grid size-6 place-items-center rounded-lg sm:mb-2 sm:size-7 md:mb-3 md:size-8 lg:size-9 ${
          highlight
            ? "bg-white/10"
            : "bg-brand-accent/10 text-brand-accent"
        }`}
      >
        <Icon className="size-3 sm:size-3.5 md:size-4" />
      </div>

      <div className="min-w-0 w-full max-w-full overflow-visible">
        <div
          className="flex min-w-0 max-w-full w-full items-baseline text-base font-bold tracking-tight tabular-nums xs:text-lg sm:text-xl md:text-2xl lg:text-3xl"
          style={{
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum" 1, "liga" 1',
            wordBreak: "keep-all",
            overflowWrap: "normal",
            whiteSpace: "nowrap",
          }}
        >
          {typeof safeValue === "number" ? (
            <AnimatedCounter
              value={numericValue}
              className="min-w-0 max-w-full overflow-visible inline-flex tabular-nums"
            />
          ) : (
            <span
              className="min-w-0 max-w-full overflow-visible whitespace-nowrap tabular-nums"
              style={{ textOverflow: "unset" }}
            >
              {displayValue}
            </span>
          )}
        </div>
        <span className="sr-only" aria-live="polite">{displayValue}</span>
      </div>

      <div
        className={`mt-1 min-w-0 break-words font-mono text-[8px] leading-3 uppercase tracking-tight xs:text-[9px] xs:leading-3.5 sm:text-[10px] sm:leading-4 sm:tracking-widest ${
          highlight ? "text-white/70" : "text-slate-400"
        }`}
      >
        {label}
      </div>
    </motion.div>
  );
}

/* ---------------- STATUS PILL ---------------- */

export function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    Paid: "bg-green-50 text-green-700",
    Ready: "bg-green-50 text-green-700",
    Collected: "bg-slate-100 text-slate-500",
  };

  const label =
    status === "Paid" || status === "Ready" ? "Ready" : status;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ring-1 ring-inset ${
        palette[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}