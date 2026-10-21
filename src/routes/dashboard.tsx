import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import { useState, useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { formatNaira } from "@/lib/store";
import { socket, connectUserSocket } from "@/lib/socket";
import { getCurrentUser, getUserToken } from "@/lib/auth";
import { useOrdersQuery } from "@/hooks/useOrdersQuery";
import { useCartQuery } from "@/hooks/useCartQuery";
import { queryKeys } from "@/lib/queryKeys";
import type {
  NormalizedOrder as Order,
  NormalizedOrderItem as OrderItem,
} from "@/lib/normalize";

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

// =====================================================
// PAGE COMPONENT
// =====================================================

function DashboardPage() {
  const queryClient = useQueryClient();

  // The session user, read from storage. The Zustand store used to be
  // asked for this, but it only ever held locally mocked users, so the
  // dashboard rendered a permanent skeleton for real students.
  const user = getCurrentUser();

  // Both queries are shared with /orders and /cart — one request serves
  // every page that needs them.
  const {
    orders,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useOrdersQuery();

  const { cart, isLoading: cartLoading } = useCartQuery();

  const loading = ordersLoading || cartLoading;
  const error = ordersError ? "Failed to load dashboard data." : null;

  // Real-time Updates
  useEffect(() => {
    if (!getUserToken()) return;

    const cleanupJoin = connectUserSocket();

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    };

    socket.on("orders:updated", invalidate);
    socket.on("cart:updated", invalidate);

    return () => {
      cleanupJoin();
      socket.off("orders:updated", invalidate);
      socket.off("cart:updated", invalidate);
    };
  }, [queryClient]);

  // ===================================================
  // DERIVED (FIXED: Removed useMemo to prevent mobile hydration bugs)
  // ===================================================
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCart = cart && Array.isArray(cart.items) ? cart : { items: [] };

  const active = safeOrders.filter((o) => o && o.status !== "Collected");
  const collected = safeOrders.filter((o) => o && o.status === "Collected");

  // Direct reduction rather than useMemo
  const cartCount = safeCart.items.reduce((acc, c: any) => {
    const qty = Number(c?.quantity ?? c?.qty ?? c?.count ?? c?.units ?? 0);
    return acc + (Number.isFinite(qty) ? qty : 0);
  }, 0);

  // ===================================================
  // GUARDS
  // ===================================================
  if (!user) {
    // A token without a stored profile means the session is incomplete.
    // The old implementation rendered an endless skeleton here.
    return (
      <AppShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <AlertCircle className="size-8 text-amber-500" />
          <h2 className="text-lg font-bold text-brand-navy">
            Your session has expired
          </h2>
          <p className="text-sm text-slate-500">
            Please sign in again to see your dashboard.
          </p>
          <Link
            to="/login"
            className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-navy/90"
          >
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:py-12" aria-busy="true">
          <div className="pointer-events-none select-none blur-[2px] opacity-70">
            <div className="mb-6 min-w-0 sm:mb-10">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 sm:w-28" />
              <div className="mt-3 h-7 w-44 animate-pulse rounded bg-slate-200 sm:h-8 sm:w-56" />
            </div>
            <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mb-3 size-8 animate-pulse rounded-lg bg-slate-200 sm:size-9" />
                  <div className="h-6 w-12 animate-pulse rounded bg-slate-200 sm:h-8 sm:w-16" />
                  <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-slate-200 sm:w-24" />
                </div>
              ))}
            </div>
            <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-lg lg:grid lg:max-w-none lg:grid-cols-3 lg:space-y-0 lg:gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <div className="mb-6 h-5 w-28 animate-pulse rounded bg-slate-200 sm:w-32" />
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200 sm:w-48" />
                        <div className="h-3 w-28 animate-pulse rounded bg-slate-200 sm:w-32" />
                      </div>
                      <div className="h-5 w-12 animate-pulse rounded bg-slate-200 sm:w-14" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:p-8">
            <AlertCircle className="mx-auto mb-3 size-7 text-red-600 sm:size-8" />
            <p className="font-semibold text-red-700 sm:text-base">Couldn't load your dashboard</p>
            <p className="mt-1 text-xs text-red-600 sm:text-sm">{error}</p>
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

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-10 lg:py-12">
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
            Matric · <span className="font-mono">{user.matric}</span>
          </p>
        </motion.div>

        <div className="mb-7 grid w-full min-w-0 grid-cols-2 items-stretch gap-3 sm:mb-10 sm:gap-4 lg:mb-12 lg:grid-cols-4">
          <StatCard icon={ClipboardList} label="Active Orders" value={active.length} />
          <StatCard icon={Package} label="Total Orders" value={safeOrders.length} />
          <StatCard icon={ShoppingCart} label="Cart Items" value={cartCount} />
          <StatCard icon={Bell} label="Unread Alerts" value={0} highlight />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* ACTIVE ORDERS */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 lg:col-span-2 lg:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-brand-navy sm:text-lg">Active orders</h2>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Your last 3 orders ready for pickup
                </p>
              </div>
              <Link
                to="/orders"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-accent transition hover:gap-2 sm:text-sm"
              >
                View all <span aria-hidden>→</span>
              </Link>
            </div>

            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center sm:px-6 sm:py-12">
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-white shadow-sm sm:size-12">
                  <Package className="size-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No active orders</p>
                <p className="mt-1 text-xs text-slate-400">Your paid orders will appear here.</p>
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
                    <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap">
                      <div className="flex shrink-0 -space-x-3">
                        {o.items.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className="grid size-10 place-items-center overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-sm sm:size-11"
                            style={{ zIndex: 10 - idx }}
                          >
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
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

                      <div className="min-w-0 flex-1 basis-24">
                        <StatusPill status={o.status} />
                        <div className="mt-1.5 truncate font-mono text-[11px] text-slate-500 sm:text-xs">
                          {o.reference}
                        </div>
                      </div>

                      <div className="ml-auto min-w-0 shrink-0 text-right">
                        <div className="text-sm font-bold text-brand-navy sm:text-base">
                          {formatNaira(o.total)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                          {o.items.length} item{o.items.length > 1 && "s"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                        <Calendar className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">Paid {formatShortDate(o.paidAt)}</span>
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
                <h2 className="text-base font-bold text-brand-navy sm:text-lg">Recent collected</h2>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Your last 3 pickups</p>
              </div>
              {collected.length > 0 && (
                <Link to="/orders" className="shrink-0 text-xs font-semibold text-brand-accent sm:text-sm">
                  View all →
                </Link>
              )}
            </div>

            {collected.length === 0 ? (
              <div className="py-8 text-center sm:py-10">
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-slate-100 sm:size-12">
                  <PackageCheck className="size-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Nothing collected yet.</p>
                <p className="mt-1 text-xs text-slate-400">Pickups will show up here once you collect them.</p>
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
                    <div className="flex min-w-0 flex-wrap items-start gap-3 sm:flex-nowrap">
                      <div className="flex shrink-0 -space-x-3">
                        {o.items.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className="grid size-9 place-items-center overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-sm sm:size-10"
                            style={{ zIndex: 10 - idx }}
                          >
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover grayscale" />
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

                      <div className="min-w-0 flex-1 basis-24">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200/60">
                          <Check className="size-3" /> Collected
                        </span>
                        <div className="mt-1.5 truncate font-mono text-[11px] text-slate-600 sm:text-xs">
                          {o.reference}
                        </div>
                      </div>

                      <div className="ml-auto min-w-0 shrink-0 text-right">
                        <div className="text-sm font-bold text-brand-navy sm:text-base">
                          {formatNaira(o.total)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-400">Paid</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                        <Calendar className="size-3 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest text-slate-400">Paid</div>
                          <div className="truncate text-slate-600">{formatShortDate(o.paidAt)}</div>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                        <PackageCheck className="size-3 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest text-slate-400">Collected</div>
                          <div className="truncate text-slate-600">
                            {o.collectedAt ? formatShortDate(o.collectedAt) : "—"}
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
/* Replaced AnimatedCounter with plain span to prevent mobile frame throttling */





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

  const displayValue = String(safeValue);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`flex h-full min-h-[145px] w-full min-w-0 flex-col rounded-2xl border p-4 sm:min-h-[155px] sm:p-4 md:min-h-[165px] lg:min-h-[175px] lg:p-5 ${
        highlight
          ? "border-transparent bg-brand-navy text-white"
          : "border-slate-200 bg-white"
      }`}
      title={displayValue}
      aria-label={`${label}: ${displayValue}`}
    >
      {/* Value on the left, icon at the end */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className="break-words text-xl font-bold leading-tight tracking-tight tabular-nums sm:text-3xl md:text-3xl"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {displayValue}
          </div>
        </div>

        <div
          className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${
            highlight
              ? "bg-white/10 text-white"
              : "bg-brand-accent/10 text-brand-accent"
          }`}
        >
          <Icon className="size-4 sm:size-5" />
        </div>
      </div>

      {/* Label stays at the bottom */}
      <div
        className={`mt-auto break-words text-[10px] font-semibold uppercase leading-4 tracking-wide sm:text-xs ${
          highlight ? "text-white/70" : "text-slate-500"
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

  const label = status === "Paid" || status === "Ready" ? "Ready" : status;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ring-1 ring-inset ${palette[status] ?? "bg-slate-100 text-slate-600"
        }`}
    >
      {label}
    </span>
  );
}