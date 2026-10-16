import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  Bell,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { formatNaira, useCurrentUser } from "@/lib/store";
import { socket, connectUserSocket } from "@/lib/socket";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

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
};

type Cart = {
  _id?: string;
  userId?: string;
  items: {
    componentId: string | { _id: string };
    quantity: number;
  }[];
};

// =====================================================
// MODULE-LEVEL CACHE
// =====================================================
// Survives navigation between pages. On repeat visits,
// the page renders instantly from cache while a silent
// background fetch updates the data.
//
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
  const id = String(raw?.id ?? raw?._id ?? "");

  const items: OrderItem[] = Array.isArray(raw?.items)
    ? raw.items.map((it: any) => {
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

  const status: Order["status"] =
    raw?.status === "Ready" || raw?.status === "Collected"
      ? raw.status
      : "Paid";

  return {
    id,
    reference: String(raw?.reference ?? ""),
    items,
    total: Number(raw?.total ?? 0),
    currency: String(raw?.currency ?? "NGN"),
    status,
    channel: raw?.channel ?? null,
    paidAt: String(
      raw?.paidAt ?? raw?.createdAt ?? new Date().toISOString()
    ),
    createdAt: String(raw?.createdAt ?? ""),
    collectedAt: raw?.collectedAt ?? null,
  };
}

// =====================================================
// LOAD DATA (silent, cached)
// =====================================================

async function loadDashboardData(): Promise<void> {
  // Reuse an in-flight request if one exists.
  if (inflight) return inflight;

  const token = sessionStorage.getItem("pulselab_token");
  if (!token) {
    throw new Error("Please login first.");
  }

  inflight = (async () => {
    try {
      // Fetch both in parallel.
      const [ordersRes, cartRes] = await Promise.all([
        fetchWithTimeout(`${API_URL}/engineering/userordersdb`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchWithTimeout(`${API_URL}/engineering/cartuserdb`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const ordersText = await ordersRes.text();
      let ordersData: any = null;
      try {
        ordersData = ordersText ? JSON.parse(ordersText) : null;
      } catch {
        throw new Error(
          `Orders endpoint returned non-JSON (HTTP ${ordersRes.status}).`
        );
      }
      if (!ordersRes.ok) {
        throw new Error(ordersData?.message || "Unable to load orders.");
      }

      const cartText = await cartRes.text();
      let cartData: any = null;
      try {
        cartData = cartText ? JSON.parse(cartText) : null;
      } catch {
        throw new Error(
          `Cart endpoint returned non-JSON (HTTP ${cartRes.status}).`
        );
      }
      if (!cartRes.ok) {
        throw new Error(cartData?.message || "Unable to load cart.");
      }

      const nextOrders: Order[] = Array.isArray(ordersData?.orders)
        ? ordersData.orders.map(normalizeOrder)
        : [];

      const nextCart: Cart = Array.isArray(cartData?.items)
        ? cartData
        : cartData?.cart && Array.isArray(cartData.cart.items)
          ? cartData.cart
          : { items: [] };

      ordersCache = nextOrders;
      cartCache = nextCart;
      dashboardLoaded = true;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// =====================================================
// PAGE
// =====================================================

function DashboardPage() {
  const user = useCurrentUser();

  // Start with cached data — no flash of loading on
  // repeat visits.
  const [orders, setOrders] = useState<Order[]>(() => ordersCache);
  const [cart, setCart] = useState<Cart>(() => cartCache);
  const [loading, setLoading] = useState(
    () => !dashboardLoaded && ordersCache.length === 0
  );
  const [error, setError] = useState<string | null>(null);

  const getToken = () =>
    sessionStorage.getItem("pulselab_token");

  // ===================================================
  // INITIAL LOAD (silent)
  // ===================================================
  useEffect(() => {
    let mounted = true;

    // If cache is empty, show loading. If cache has data,
    // do NOT flip loading to true — we'll update silently.
    const isFirstLoad = !dashboardLoaded;

    if (isFirstLoad) {
      setLoading(true);
      setError(null);
    }

    loadDashboardData()
      .then(() => {
        if (!mounted) return;
        setOrders(ordersCache);
        setCart(cartCache);
      })
      .catch((err: any) => {
        if (!mounted) return;
        // Only surface the error if there's no cached data
        // to fall back on.
        if (ordersCache.length === 0) {
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
    const token = getToken();
    if (!token) return;

    const cleanupJoin = connectUserSocket();

    const refresh = async () => {
      try {
        await loadDashboardData();
        setOrders(ordersCache);
        setCart(cartCache);
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
      cleanupJoin();
      socket.off("orders:updated", onOrdersUpdated);
      socket.off("cart:updated", onCartUpdated);
    };
  }, []);

  // ===================================================
  // DERIVED
  // ===================================================
  const active = useMemo(
    () => orders.filter((o) => o.status !== "Collected"),
    [orders]
  );

  const cartCount = useMemo(
    () =>
      cart.items.reduce(
        (a, c) => a + (Number(c.quantity) || 0),
        0
      ),
    [cart]
  );

  // ===================================================
  // USER NOT LOADED YET
  // ===================================================
  if (!user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
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
          className="mx-auto max-w-7xl px-6 py-12"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="pointer-events-none select-none">
            <div className="blur-[2px] opacity-70">
              {/* HEADER SKELETON */}
              <div className="mb-10">
                <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-8 w-56 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-200" />
              </div>

              {/* STATS SKELETON */}
              <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="mb-3 size-9 animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-2.5 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>

              {/* MAIN GRID SKELETON */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3.5 w-48 animate-pulse rounded bg-slate-200" />
                          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                        </div>
                        <div className="h-5 w-14 animate-pulse rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-6 h-5 w-32 animate-pulse rounded bg-slate-200" />

                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-lg bg-slate-50 p-3"
                      >
                        <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center font-mono text-xs uppercase tracking-widest text-slate-400">
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
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 size-8 text-red-600" />
            <p className="font-semibold text-red-700">
              Couldn't load your dashboard
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
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
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="font-mono text-[13px] uppercase tracking-widest text-slate-400">
            Welcome back
          </p>

          <h1 className="mt-1 text-3xl font-bold text-brand-navy">
            {user.fullName}
          </h1>

          <p className="mt-1 text-slate-600">
            Matric ·{" "}
            <span className="font-mono">{user.matric}</span>
          </p>
        </motion.div>

        {/* STATS */}
        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={ClipboardList}
            label="Active Orders"
            value={active.length}
          />
          <StatCard
            icon={Package}
            label="Total Orders"
            value={orders.length}
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ACTIVE ORDERS */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-navy">
                Active orders
              </h2>

              <Link
                to="/orders"
                className="text-sm font-semibold text-brand-accent"
              >
                View all →
              </Link>
            </div>

            {active.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No active orders.{" "}
                <Link to="/components" className="text-brand-accent">
                  Browse components
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {active.slice(0, 5).map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm font-semibold text-brand-navy">
                        {o.reference}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        {o.items.length} item
                        {o.items.length > 1 && "s"} ·{" "}
                        {formatNaira(o.total)}
                      </div>
                    </div>

                    <StatusPill status={o.status} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* RECENT ACTIVITY */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <h2 className="mb-6 text-lg font-bold text-brand-navy">
              Recent activity
            </h2>

            {orders.length === 0 ? (
              <p className="text-sm text-slate-400">
                Your recent orders will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((o) => {
                  const isCollected = o.status === "Collected";
                  return (
                    <div
                      key={o.id}
                      className={`rounded-lg p-3 text-sm ${
                        isCollected
                          ? "bg-slate-50 text-slate-500"
                          : "bg-brand-accent/5 text-brand-navy"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="size-4 shrink-0 opacity-70" />
                        <span className="truncate font-medium">
                          {isCollected ? "Collected" : "Ready for pickup"}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] opacity-70">
                        {o.reference}
                      </div>
                    </div>
                  );
                })}
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
  value: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-transparent bg-brand-navy text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`mb-3 grid size-9 place-items-center rounded-lg ${
          highlight
            ? "bg-white/10"
            : "bg-brand-accent/10 text-brand-accent"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div className="text-3xl font-bold tracking-tight">
        <AnimatedCounter value={value} />
      </div>

      <div
        className={`mt-1 font-mono text-[10px] uppercase tracking-widest ${
          highlight ? "text-white/60" : "text-slate-400"
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
      className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-tight ${
        palette[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}