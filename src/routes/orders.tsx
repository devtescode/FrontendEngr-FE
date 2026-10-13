import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Loader2,
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
import { socket } from "@/lib/socket";

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
  status: "Paid";
  channel: string | null;
  paidAt: string;
  createdAt: string;
};

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
// PAGE
// =====================================================

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track new orders that arrive via socket so we can
  // animate/highlight them briefly.
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    new Set()
  );

  const hasLoadedOnce = useRef(false);

  const getToken = () =>
    sessionStorage.getItem("pulselab_token");

  // ===================================================
  // FETCH PAID ORDERS
  // ===================================================
  const loadOrders = async (opts?: { silent?: boolean }) => {
    const token = getToken();

    if (!token) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }

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

      const nextOrders: Order[] = Array.isArray(data?.orders)
        ? data.orders
        : [];

      // Detect new orders that weren't there before
      // so we can highlight them.
      if (hasLoadedOnce.current) {
        setOrders((prev) => {
          const prevIds = new Set(prev.map((o) => o.id));
          const newIds = new Set<string>();

          nextOrders.forEach((o) => {
            if (!prevIds.has(o.id)) newIds.add(o.id);
          });

          if (newIds.size > 0) {
            setHighlightedIds(newIds);

            // Clear highlight after 4 seconds.
            setTimeout(() => {
              setHighlightedIds(new Set());
            }, 4000);
          }

          return nextOrders;
        });
      } else {
        setOrders(nextOrders);
        hasLoadedOnce.current = true;
      }
    } catch (err: any) {
      if (!opts?.silent) {
        setError(err?.message || "Unable to load orders.");
      } else {
        console.error("Silent orders refresh failed:", err);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  // ===================================================
  // INITIAL FETCH
  // ===================================================
  useEffect(() => {
    loadOrders();
  }, []);

  // ===================================================
  // REAL-TIME UPDATES VIA SOCKET
  // ===================================================
  //
  // The backend should emit "orders:updated" (or
  // "cart:updated" after payment completes) to the
  // user's room. We listen and silently refetch.
  //
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // =================================================
    // JOIN THE USER'S ROOM
    // =================================================
    // Your server joins socket rooms by userId. We need
    // to know the userId — it's stored in sessionStorage
    // by your auth flow, so pull it from there.
    //
    const userId =
      sessionStorage.getItem("pulselab_userId") ||
      sessionStorage.getItem("pulselab_user_id");

    if (userId) {
      socket.emit("user:join", { userId });
    }

    const handleOrderUpdate = () => {
      console.log("🟢 orders:updated received — refetching silently");
      loadOrders({ silent: true });
    };

    socket.on("orders:updated", handleOrderUpdate);
    // Also refetch when the cart is cleared after payment.
    socket.on("cart:updated", handleOrderUpdate);

    // If already connected, join immediately.
    if (socket.connected && userId) {
      socket.emit("user:join", { userId });
    }

    return () => {
      socket.off("orders:updated", handleOrderUpdate);
      socket.off("cart:updated", handleOrderUpdate);
    };
  }, []);

  // ===================================================
  // PAGE
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

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-navy" />
            <p className="text-slate-500">Loading your orders...</p>
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
                    {/* ====================================
                        HEADER STRIP
                    ==================================== */}
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

                    {/* ====================================
                        ITEMS WITH IMAGES
                    ==================================== */}
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
                            {/* ITEM IMAGE */}
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

                            {/* NAME + META */}
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

                            {/* LINE TOTAL */}
                            <div className="shrink-0 text-right font-bold text-brand-navy">
                              {formatNaira(item.price * item.quantity)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* ====================================
                        FOOTER / META + TOTAL
                    ==================================== */}
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

                    {/* ====================================
                        PICKUP BANNER
                    ==================================== */}
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