import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  Sparkles,
  PackageCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { socket, connectUserSocket } from "@/lib/socket";
import { useOrdersQuery } from "@/hooks/useOrdersQuery";
import { queryKeys } from "@/lib/queryKeys";
import type { NormalizedOrder } from "@/lib/normalize";
import logoImg from "../components/Assets/image.webp";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — EU Hardwarestore" }] }),
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

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// =====================================================
// STATUS CONFIG
// =====================================================

const STATUS = {
  Paid: {
    label: "Ready for Pickup",
    short: "Paid",
    description:
      "Visit the FENG with your matric number to collect your order.",
    icon: PackageCheck,
    pillBg: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    pillDot: "bg-emerald-500",
    barBg: "bg-emerald-500",
    bannerBg: "bg-emerald-50/60",
    bannerBorder: "border-emerald-100",
    bannerText: "text-emerald-700",
    bannerIcon: "text-emerald-500",
  },
  Ready: {
    label: "Ready for Pickup",
    short: "Paid",
    description:
      "Visit the FENG with your matric number to collect your order.",
    icon: PackageCheck,
    pillBg: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    pillDot: "bg-emerald-500",
    barBg: "bg-emerald-500",
    bannerBg: "bg-emerald-50/60",
    bannerBorder: "border-emerald-100",
    bannerText: "text-emerald-700",
    bannerIcon: "text-emerald-500",
  },
  Collected: {
    label: "Collected",
    short: "Collected",
    description:
      "You've picked up this order. Thanks for shopping with EU Hardwarestore.",
    icon: CheckCircle2,
    pillBg: "bg-slate-100 text-slate-600 ring-slate-200/60",
    pillDot: "bg-slate-400",
    barBg: "bg-slate-300",
    bannerBg: "bg-slate-50/60",
    bannerBorder: "border-slate-200",
    bannerText: "text-slate-600",
    bannerIcon: "text-slate-400",
  },
} as const;

type StatusKey = keyof typeof STATUS;

const getStatusConfig = (status: string) =>
  STATUS[status as StatusKey] ?? STATUS.Paid;

// =====================================================
// TABS CONFIG
// =====================================================

type TabKey = "All" | "Paid" | "Collected";

const TABS: { key: TabKey; label: string }[] = [
  { key: "All", label: "All Orders" },
  { key: "Paid", label: "Paid" },
  { key: "Collected", label: "Collected" },
];

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
    </motion.div>
  );
}

// =====================================================
// PAGE
// =====================================================

function OrdersPage() {
  const queryClient = useQueryClient();

  const {
    orders,
    isLoading: loading,
    isError,
    error: queryError,
    refetch,
  } = useOrdersQuery();

  const [activeTab, setActiveTab] = useState<TabKey>("All");

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    new Set()
  );

  const error = isError
    ? "Unable to load your orders. Please try again."
    : null;

  const prevOrderIds = useRef<Set<string>>(new Set());

  // ===================================================
  // HIGHLIGHT NEWLY ARRIVED ORDERS
  // ===================================================
  useEffect(() => {
    const nextIds = new Set(orders.map((o) => o.id));
    const newIds = new Set<string>();

    nextIds.forEach((id) => {
      if (!prevOrderIds.current.has(id)) newIds.add(id);
    });

    prevOrderIds.current = nextIds;

    if (newIds.size > 0) {
      setHighlightedIds(newIds);
      const timer = setTimeout(() => setHighlightedIds(new Set()), 4000);
      return () => clearTimeout(timer);
    }
  }, [orders]);

  // ===================================================
  // SOCKET
  // ===================================================
  // The backend pushes `orders:updated` when a pickup status changes and
  // `cart:updated` after a payment. Both invalidate the shared query.
  useEffect(() => {
    const token = sessionStorage.getItem("pulselab_token");
    if (!token) return;

    const cleanupJoin = connectUserSocket();

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    };

    const onOrdersUpdated = () => {
      invalidate();
    };
    const onCartUpdated = () => {
      invalidate();
    };

    socket.on("orders:updated", onOrdersUpdated);
    socket.on("cart:updated", onCartUpdated);

    return () => {
      cleanupJoin();
      socket.off("orders:updated", onOrdersUpdated);
      socket.off("cart:updated", onCartUpdated);
    };
  }, [queryClient]);

  // ===================================================
  // COUNTS
  // ===================================================
  const counts = useMemo<Record<TabKey, number>>(() => {
    return {
      All: orders.length,
      Paid: orders.filter(
        (o) => (o as any).status !== "Collected"
      ).length,
      Collected: orders.filter(
        (o) => (o as any).status === "Collected"
      ).length,
    };
  }, [orders]);

  // ===================================================
  // VISIBLE ORDERS
  // ===================================================
  const visibleOrders = useMemo(() => {
    if (activeTab === "All") return orders;

    if (activeTab === "Paid") {
      return orders.filter(
        (o) => (o as any).status !== "Collected"
      );
    }

    return orders.filter(
      (o) => (o as any).status === "Collected"
    );
  }, [orders, activeTab]);

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* HEADER */}
        <div className="mb-8">
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

        {/* TABS */}
        {!loading && orders.length > 0 && (
          <Tabs
            tabs={TABS}
            counts={counts}
            active={activeTab}
            onChange={setActiveTab}
          />
        )}

        {/* LOADING */}
        {loading && orders.length === 0 && (
          <div
            className="pointer-events-none select-none space-y-5"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="relative">
              <div className="space-y-5 blur-[2px] opacity-70 transition-all">
                <OrderSkeleton index={0} />
                <OrderSkeleton index={1} />
              </div>
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
                void refetch();
              }}
              className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* EMPTY (no orders at all) */}
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

        {/* EMPTY (no orders in this tab) */}
        {!loading &&
          !error &&
          orders.length > 0 &&
          visibleOrders.length === 0 && (
            <EmptyTabState
              tab={activeTab}
              onReset={() => setActiveTab("All")}
            />
          )}

        {/* ORDERS LIST */}
        {!loading && !error && visibleOrders.length > 0 && (
          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {visibleOrders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  isHighlighted={highlightedIds.has(order.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// =====================================================
// TABS
// =====================================================

function Tabs({
  tabs,
  counts,
  active,
  onChange,
}: {
  tabs: { key: TabKey; label: string }[];
  counts: Record<TabKey, number>;
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <div className="mb-8 border-b border-slate-200">
      <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const count = counts[tab.key];
          const disabled = count === 0 && tab.key !== "All";

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => !disabled && onChange(tab.key)}
              disabled={disabled}
              className={`group relative shrink-0 px-4 py-3 text-sm font-medium transition-colors ${disabled
                ? "cursor-not-allowed text-slate-300"
                : isActive
                  ? "text-brand-navy"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              <div className="flex items-center gap-2">
                <span>{tab.label}</span>
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive
                    ? "bg-brand-navy text-white"
                    : disabled
                      ? "bg-slate-100 text-slate-300"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                >
                  {count}
                </span>
              </div>

              {isActive && (
                <motion.div
                  layoutId="orders-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-navy"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// EMPTY TAB STATE
// =====================================================

function EmptyTabState({
  tab,
  onReset,
}: {
  tab: TabKey;
  onReset: () => void;
}) {
  const config =
    tab === "Paid"
      ? {
        title: "No Paid orders",
        description:
          "You don't have any orders waiting to be picked up right now.",
      }
      : tab === "Collected"
        ? {
          title: "Nothing collected yet",
          description:
            "Orders you've picked up from the lab will appear here.",
        }
        : {
          title: "Nothing here",
          description: "",
        };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center"
    >
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-slate-100">
        <ShoppingBag className="size-6 text-slate-400" />
      </div>

      <h3 className="text-lg font-semibold text-brand-navy">
        {config.title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {config.description}
      </p>

      <button
        onClick={onReset}
        className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        View all orders
      </button>
    </motion.div>
  );
}

// =====================================================
// ORDER CARD
// =====================================================

function OrderCard({
  order,
  index,
  isHighlighted,
}: {
  order: NormalizedOrder;
  index: number;
  isHighlighted: boolean;
}) {
  const statusKey = ((order as any).status as StatusKey) || "Paid";
  const config = getStatusConfig(statusKey);
  const StatusIcon = config.icon;

  const totalUnits = order.items.reduce(
    (a, i) => a + i.quantity,
    0
  );

  const isCollected = statusKey === "Collected";

  return (
    <motion.div
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
      className={`relative overflow-hidden rounded-2xl border bg-white transition-shadow ${isCollected
        ? "border-slate-200 opacity-90 hover:opacity-100"
        : "border-slate-200 hover:shadow-lg"
        }`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 ${config.barBg}`}
      />

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4 pl-7">
        <div className="flex items-center gap-3">

          <div
            className={`size-12 shrink-0 overflow-hidden rounded-full border-2 shadow-md transition-all duration-300 sm:size-14 ${isCollected
                ? "border-slate-300 bg-slate-400"
                : "border-white/20 bg-brand-navy"
              }`}
          >
            <img
              src={logoImg}
              // alt={BRAND.name}
              className="h-full w-full rounded-full object-cover"
            />
          </div>

          {/* <Receipt className="size-5" /> */}
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
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.pillBg}`}
          >
            <span
              className={`size-1.5 rounded-full ${config.pillDot}`}
            />
            {config.short}
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
      <div className="px-6 py-5 pl-7">
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
                    className={`h-full w-full object-cover ${isCollected ? "grayscale" : ""
                      }`}
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
                    {formatNaira(item.price)} × {item.quantity}
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
      <div
        className={`grid gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-4 pl-7 ${isCollected ? "sm:grid-cols-4" : "sm:grid-cols-3"
          }`}
      >
        {/* PAID ON */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="size-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Paid on
            </div>
            <div className="text-slate-700">
              {formatDateTime(order.paidAt)}
            </div>
          </div>
        </div>

        {/* COLLECTED ON */}
        {isCollected && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <PackageCheck className="size-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                Collected on
              </div>
              <div className="text-slate-700">
                {order.collectedAt
                  ? formatDateTime(order.collectedAt)
                  : "—"}
              </div>
            </div>
          </div>
        )}

        {/* ITEMS */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Hash className="size-4 shrink-0 text-slate-400" />
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

        {/* TOTAL */}
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

      {/* STATUS BANNER */}
      <div
        className={`border-t px-6 py-3 pl-7 ${config.bannerBg} ${config.bannerBorder}`}
      >
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <StatusIcon
            className={`size-4 shrink-0 ${config.bannerIcon}`}
          />
          <span className={`font-semibold ${config.bannerText}`}>
            {config.label}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">
            {config.description}
          </span>
        </div>
      </div>
    </motion.div>
  );
}