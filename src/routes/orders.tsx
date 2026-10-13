import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  AlertCircle,
  CreditCard,
  Building2,
  CheckCircle2,
  ShoppingBag,
  Receipt,
  Calendar,
  Hash,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { socket, connectUserSocket } from "@/lib/socket";
import {
  ordersCache,
  loadOrders,
  setOrdersCache,
  type Order,
} from "@/lib/ordersStore";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — PulseLab" }] }),
  component: () => (
    <RequireAuth role="student">
      <OrdersPage />
    </RequireAuth>
  ),
});

// =====================================================
// HELPERS
// =====================================================

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// =====================================================
// SKELETON
// =====================================================

function OrderSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      {/* HEADER STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-2.5 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-3.5 w-40 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* ITEMS */}
      <div className="px-6 py-5">
        <div className="mb-4 h-2.5 w-20 rounded bg-slate-200 animate-pulse" />
        <ul className="space-y-3">
          {[0, 1].map((i) => (
            <li key={i} className="flex items-center gap-4">
              <div className="size-14 shrink-0 rounded-lg bg-slate-200 animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-3/4 rounded bg-slate-200 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="h-4 w-20 shrink-0 rounded bg-slate-200 animate-pulse" />
            </li>
          ))}
        </ul>
      </div>

      {/* FOOTER */}
      <div className="grid gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-4 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded bg-slate-200 animate-pulse" />
          <div className="h-3.5 w-32 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-12 rounded bg-slate-200 animate-pulse" />
          <div className="h-3.5 w-20 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="flex items-end justify-end">
          <div className="space-y-2 text-right">
            <div className="ml-auto h-2.5 w-16 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-5 w-24 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>

      {/* PICKUP BANNER */}
      <div className="border-t border-slate-100 bg-brand-gold/5 px-6 py-3">
        <div className="h-3.5 w-2/3 rounded bg-slate-200 animate-pulse" />
      </div>
    </motion.div>
  );
}

// =====================================================
// PAGE
// =====================================================

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(() => ordersCache);
  const [loading, setLoading] = useState(
    () => ordersCache.length === 0
  );
  const [error, setError] = useState<string | null>(null);

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    new Set()
  );

  const hasLoadedOnce = useRef(ordersCache.length > 0);

  // ===================================================
  // INITIAL LOAD
  // ===================================================
  useEffect(() => {
    let mounted = true;

    if (ordersCache.length > 0) {
      setOrders(ordersCache);
      setLoading(false);
      hasLoadedOnce.current = true;
      return;
    }

    setLoading(true);
    setError(null);

    loadOrders()
      .then((data) => {
        if (!mounted) return;
        setOrders(data);
        hasLoadedOnce.current = true;
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error("❌ Orders load failed:", err);
        setError(err?.message || "Unable to load orders.");
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
  // SILENT REFRESH
  // ===================================================
  const refreshOrdersSilently = async () => {
    const token = sessionStorage.getItem("pulselab_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/engineering/getorders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // const data = await response.json();
      
      
      const rawText = await response.text();
      const data = rawText ? JSON.parse(rawText) : null;
      console.log("🔍 FULL RESPONSE:", data);

      if (!response.ok) return;

      const next: Order[] = Array.isArray(data?.orders)
        ? data.orders
        : [];

      setOrders((prev) => {
        const prevIds = new Set(prev.map((o) => o.id));
        const newIds = new Set<string>();
        next.forEach((o) => {
          if (!prevIds.has(o.id)) newIds.add(o.id);
        });

        if (newIds.size > 0) {
          setHighlightedIds(newIds);
          setTimeout(() => setHighlightedIds(new Set()), 4000);
        }

        return next;
      });

      setOrdersCache(next);
    } catch (err) {
      console.error("Silent orders refresh failed:", err);
    }
  };

  // ===================================================
  // SOCKET
  // ===================================================
  useEffect(() => {
    const token = sessionStorage.getItem("pulselab_token");
    if (!token) return;

    const cleanupJoin = connectUserSocket();

    const onOrdersUpdated = () => {
      console.log("🟢 orders:updated received");
      refreshOrdersSilently();
    };
    const onCartUpdated = () => {
      console.log("🟢 cart:updated received");
      refreshOrdersSilently();
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
  // RENDER
  // ===================================================
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* HEADER */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-navy/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-brand-navy">
              <Sparkles className="size-3" />
              Your purchase history
            </div>
            <h1 className="text-4xl font-bold text-brand-navy">
              My Orders
            </h1>
            <p className="mt-2 text-slate-500">
              Track every order from payment to pickup.
            </p>
          </div>

          {!loading && orders.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-mono uppercase tracking-widest text-slate-400">
              {orders.length} paid{" "}
              {orders.length === 1 ? "order" : "orders"}
            </div>
          )}
        </div>

        {/* =================================================
            LOADING — BLURRED SKELETON
        ================================================= */}
        {loading && orders.length === 0 && (
          <div
            className="pointer-events-none select-none space-y-5"
            aria-busy="true"
            aria-live="polite"
          >
            {/* Slight blur + fade so it reads as "loading" */}
            <div className="relative">
              <div className="space-y-5 blur-[2px] opacity-70 transition-all">
                <OrderSkeleton index={0} />
                <OrderSkeleton index={1} />
              </div>

              {/* Soft gradient mask so the bottom fades */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
            </div>

            <p className="text-center text-xs font-mono uppercase tracking-widest text-slate-400">
              Loading your orders...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 size-8 text-red-600" />
            <p className="font-semibold text-red-700">
              Couldn't load orders
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                loadOrders()
                  .then(setOrders)
                  .catch((e: any) => setError(e?.message))
                  .finally(() => setLoading(false));
              }}
              className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <ShoppingBag className="mx-auto mb-5 size-12 text-slate-300" />
            <h2 className="text-xl font-semibold text-brand-navy">
              No orders yet
            </h2>
            <p className="mt-2 text-slate-500">
              Once you complete a payment, your order will
              appear here.
            </p>
            <Link
              to="/components"
              className="mt-6 inline-block rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Start browsing
            </Link>
          </div>
        )}

        {/* ORDERS LIST */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => {
                const isHighlighted = highlightedIds.has(order.id);
                const totalUnits = order.items.reduce(
                  (a, i) => a + i.quantity,
                  0
                );
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      boxShadow: isHighlighted
                        ? "0 0 0 3px rgba(34, 197, 94, 0.25)"
                        : "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ delay: index * 0.04 }}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg"
                  >
                    {/* HEADER STRIP */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-xl bg-brand-navy text-white shadow-sm">
                          <Receipt className="size-5" />
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                            Order Reference
                          </div>
                          <div className="font-mono text-sm font-semibold text-brand-navy">
                            {order.reference}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200/60">
                          <CheckCircle2 className="size-3.5" />
                          Paid
                        </span>
                        {order.channel && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                            {order.channel === "card" ? (
                              <CreditCard className="size-3.5" />
                            ) : (
                              <Building2 className="size-3.5" />
                            )}
                            {order.channel.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ITEMS */}
                    <div className="px-6 py-5">
                      <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                        <Package className="size-3.5" />
                        Items ({order.items.length})
                      </div>

                      <ul className="divide-y divide-slate-100">
                        {order.items.map((item, idx) => (
                          <li
                            key={`${order.id}-${idx}`}
                            className="flex items-center gap-4 py-3"
                          >
                            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="size-5 text-slate-300" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-brand-navy">
                                {item.name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                {item.sku && (
                                  <span className="font-mono">
                                    SKU: {item.sku}
                                  </span>
                                )}
                                {item.sku && (
                                  <span className="text-slate-300">•</span>
                                )}
                                <span>
                                  {formatNaira(item.price)} ×{" "}
                                  {item.quantity}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right font-bold text-brand-navy">
                              {formatNaira(item.price * item.quantity)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* FOOTER */}
                    <div className="grid gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-4 sm:grid-cols-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="size-4 text-slate-400" />
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-400">
                            Paid on
                          </div>
                          <div className="text-slate-700">
                            {formatDateTime(order.paidAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Hash className="size-4 text-slate-400" />
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-400">
                            Items
                          </div>
                          <div className="text-slate-700">
                            {totalUnits}{" "}
                            {totalUnits === 1 ? "unit" : "units"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-widest text-slate-400">
                            Total Paid
                          </div>
                          <div className="text-xl font-bold text-brand-navy">
                            {formatNaira(order.total)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PICKUP BANNER */}
                    <div className="border-t border-slate-100 bg-brand-gold/5 px-6 py-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <CheckCircle2 className="size-4 text-brand-gold" />
                        <span className="font-semibold text-brand-gold">
                          Payment received
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">
                          We'll notify you when your order is
                          ready for pickup.
                        </span>
                        <ArrowRight className="ml-auto size-3.5 text-slate-400" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}