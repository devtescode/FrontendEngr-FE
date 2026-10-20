import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  LogOut,
  Users,
  PackageCheck,
  ShoppingBag,
  RefreshCw,
  Package,
  Menu,
  X,
  Clock3,
  CheckCircle2,
  HandCoins,
  CircleDollarSign,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Layers,
  BarChart3, 
  ShoppingCart,
  CreditCard,
  
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import type { PaymentOrder } from "@/lib/store";
import { useAdminRealtime } from "@/lib/useAdminRealtime";
import { fetchAdminOverview } from "../lib/adminApi";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — EU Hardwarestore" }] }),
  component: AdminLayout,
});

import { API_BASE_URL } from "@/lib/config";
const API_URL = API_BASE_URL;

/* ============================================================
   HELPERS
   ============================================================ */

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

/**
 * Images can come back as a full URL (cloudinary / render host),
 * a server path ("/uploads/x.png") or a bare filename. Normalise
 * them so the <img> never points at the frontend origin.
 */
function resolveImage(src?: string | null): string | null {
  if (!src) return null;
  const value = String(src).trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/")) return `${API_URL}${value}`;
  return `${API_URL}/uploads/${value}`;
}

const timeOf = (iso?: string | null) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const then = timeOf(iso);
  if (!then) return "—";

  const diff = Date.now() - then;
  if (diff < 0) return "just now";

  const secs = Math.floor(diff / 1000);
  if (secs < 60) return secs < 5 ? "just now" : `${secs}s ago`;

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return new Date(then).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ============================================================
   ORDER STAGES
   ============================================================ */

type OrderStage = "unpaid" | "paid" | "ready" | "collected";

function stageOf(order: PaymentOrder): OrderStage {
  const paid = String(order?.paymentStatus ?? "").toLowerCase() === "paid";
  const pickup = String(order?.pickupStatus ?? "").toLowerCase();

  if (pickup === "collected") return "collected";
  if (!paid) return "unpaid";
  if (pickup === "ready") return "ready";
  return "paid";
}

const STAGE_META: Record<OrderStage, { label: string; chip: string; dot: string }> = {
  unpaid: {
    label: "Unpaid",
    chip: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
  paid: {
    label: "Paid",
    chip: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
  ready: {
    label: "Ready",
    chip: "border-brand-accent/25 bg-brand-accent/10 text-brand-accent",
    dot: "bg-brand-accent",
  },
  collected: {
    label: "Collected",
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
};

/** Total paid for an order, in naira. */
function orderTotal(order: PaymentOrder): number {
  const kobo = Number(order?.amountKobo ?? order?.amount);
  if (Number.isFinite(kobo) && kobo > 0) return kobo / 100;

  const naira = Number(order?.amountNaira);
  if (Number.isFinite(naira) && naira > 0) return naira;

  return (order?.items ?? []).reduce(
    (sum, i) => sum + Number(i?.price ?? 0) * Number(i?.quantity ?? 0),
    0,
  );
}

function orderUnitCount(order: PaymentOrder): number {
  const provided = Number(order?.itemCount);
  if (Number.isFinite(provided) && provided > 0) return provided;
  return (order?.items ?? []).reduce((sum, i) => sum + Number(i?.quantity ?? 0), 0);
}

/* ============================================================
   LAYOUT
   ============================================================ */

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/admin/login") return <Outlet />;
  return (
    <RequireAuth role="admin">
      <AdminShell />
    </RequireAuth>
  );
}

const NAV: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/components", label: "Inventory", icon: Boxes },
  { to: "/admin/orders", label: "User Carts", icon: ClipboardList },
  { to: "/admin/pickup", label: "Pickup", icon: ShoppingBag },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/collected", label: "Collected", icon: PackageCheck },
];

function AdminShell() {
  useAdminRealtime();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [hydrating, setHydrating] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminOverview()
      .then(() => {
        if (cancelled) return;
        setApiOnline(true);
        setLastUpdated(new Date());
      })
      .catch((e) => {
        console.error("overview:", e);
        if (!cancelled) setApiOnline(false);
      })
      .finally(() => !cancelled && setHydrating(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchAdminOverview();
      setApiOnline(true);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setApiOnline(false);
    } finally {
      setRefreshing(false);
    }
  };

  if (hydrating) return <AdminSkeleton />;

  return (
    <AdminLayoutShell apiOnline={apiOnline}>
      {pathname === "/admin" ? (
        <AdminOverview onRefresh={refresh} refreshing={refreshing} lastUpdated={lastUpdated} />
      ) : (
        <Outlet />
      )}
    </AdminLayoutShell>
  );
}

function AdminLayoutShell({
  children,
  apiOnline,
}: {
  children: React.ReactNode;
  apiOnline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  /* Lock the page behind the mobile drawer so the content
     underneath does not scroll while the menu is open. */
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  /* Close the drawer when the viewport grows to desktop. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-dvh bg-slate-950 text-white lg:h-screen lg:overflow-hidden">
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed lg:static z-50 top-0 left-0 h-dvh w-[18rem] max-w-[88vw] sm:w-[19rem] lg:w-64 lg:max-w-none
          border-r border-white/5 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/95
          flex flex-col overflow-y-auto shadow-2xl shadow-black/60
          transform transition-[transform,box-shadow] duration-300 ease-out
          ${open ? "translate-x-0 shadow-2xl" : "-translate-x-full"} lg:translate-x-0 lg:shadow-none
        `}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-5 sm:py-5">
          <div className="min-w-0">
            <Logo className="text-white" />
            {/* <div className="mt-1.5 font-mono text-white text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Admin Console
            </div> */}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2.5 sm:p-3">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-brand-accent/20 to-brand-accent/10 text-brand-accent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <n.icon className={`size-4 transition-colors ${active ? "text-brand-accent" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* BACKEND STATUS */}
        <div className="space-y-2.5 border-t border-white/5 p-2.5 sm:p-3">
          {/* <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <span className="relative flex size-2">
              <span
                className={`absolute inline-flex size-full animate-ping rounded-full opacity-70 ${
                  apiOnline ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex size-2 rounded-full ${
                  apiOnline ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
            </span>

            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Engr-BE API
              </p>
              <p className="truncate text-xs font-medium text-slate-300">
                {apiOnline ? "Connected" : "Reconnecting…"}
              </p>
            </div>
          </div> */}

          <button
            onClick={() => {
              logout();
              navigate({ to: "/admin/login" });
            }}
            className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-300 sm:gap-3 sm:px-3"
          >
            <LogOut className="size-4 text-slate-500 transition-colors group-hover:text-rose-300" />
            <span className="truncate">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden overflow-y-auto transition-all">
        <div className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-white/5 bg-slate-950/95 px-3 py-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/80 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-white/[0.04] p-1.5 text-slate-200 transition-colors hover:bg-white/[0.08] sm:p-2"
            aria-label="Open menu"
          >
            <Menu className="size-4 sm:size-5" />
          </button>
          <span className="truncate text-xs font-semibold tracking-tight text-white sm:text-sm">Admin Console</span>
        </div>
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   OVERVIEW
   ============================================================ */

type OrderFilter = "all" | "awaiting" | "collected";

function AdminOverview({
  onRefresh,
  refreshing,
  lastUpdated,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: Date | null;
}) {
  const orders = useStore((s) => s.orders);
  const components = useStore((s) => s.components);
  const users = useStore((s) => s.users);
  const [filter, setFilter] = useState<OrderFilter>("all");

  /* ---------------------------------------------------
     Component images, keyed by component id, so an order
     row can show a picture even when the order payload
     only carries the component id.
  --------------------------------------------------- */
  const imageByComponent = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of components) {
      const img = resolveImage(c?.image);
      if (c?.id && img) map.set(c.id, img);
    }
    return map;
  }, [components]);

  const stats = useMemo(() => {
    const isPaid = (o: PaymentOrder) => String(o?.paymentStatus ?? "").toLowerCase() === "paid";
    const isCollected = (o: PaymentOrder) =>
      String(o?.pickupStatus ?? "").toLowerCase() === "collected";
    const isReady = (o: PaymentOrder) => String(o?.pickupStatus ?? "").toLowerCase() === "ready";

    const paidOrders = orders.filter(isPaid);

    const revenue = paidOrders.reduce((sum, o) => sum + orderTotal(o), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter((o) => {
      const d = new Date(o.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    const revenueToday = paidOrders
      .filter((o) => {
        const d = new Date(o.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
      .reduce((sum, o) => sum + orderTotal(o), 0);

    const totalUsers = users.filter((u) => u.role !== "admin").length;

    return {
      total: orders.length,
      paidCount: paidOrders.length,
      /* paid, but the student has not collected it yet */
      awaitingPickup: paidOrders.filter((o) => !isCollected(o)).length,
      ready: paidOrders.filter((o) => isReady(o)).length,
      collected: paidOrders.filter((o) => isCollected(o)).length,
      unpaid: orders.length - paidOrders.length,
      revenue,
      revenueToday,
      ordersToday: ordersToday.length,
      lowStock: components.filter((c) => Number(c?.stock ?? 0) < 10).length,
      outOfStock: components.filter((c) => Number(c?.stock ?? 0) <= 0).length,
      totalComponents: components.length,
      totalUsers,
    };
  }, [orders, components, users]);

  /* ---------------------------------------------------
     The 5 most recent orders, newest first.
  --------------------------------------------------- */
  const recent = useMemo(() => {
    const sorted = [...orders].sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));

    const filtered = sorted.filter((o) => {
      const stage = stageOf(o);
      if (filter === "awaiting") return stage === "paid" || stage === "ready";
      if (filter === "collected") return stage === "collected";
      return true;
    });

    return filtered.slice(0, 5);
  }, [orders, filter]);

  const matchingCount = useMemo(() => {
    if (filter === "awaiting")
      return orders.filter((o) => {
        const s = stageOf(o);
        return s === "paid" || s === "ready";
      }).length;
    if (filter === "collected") return orders.filter((o) => stageOf(o) === "collected").length;
    return orders.length;
  }, [orders, filter]);

  const lowStockItems = useMemo(
    () =>
      [...components]
        .filter((c) => Number(c?.stock ?? 0) < 10)
        .sort((a, b) => Number(a?.stock ?? 0) - Number(b?.stock ?? 0))
        .slice(0, 4),
    [components],
  );

  return (
    <div className="bg-slate-950 px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        {/* ================= HEADER ================= */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-start md:justify-between"
        >
          <div className="min-w-0">
            {/* <p className="flex items-center gap-2 text-sm font-medium text-brand-accent">
              <Server className="size-4" />
              Engr-BE · Admin Console
            </p> */}

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Operations Overview
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400 sm:mt-2">
              Live view of paid orders, hand-overs and stock levels for the EU
              hardware hub.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-slate-500 sm:block">
                Synced {timeAgo(lastUpdated.toISOString())}
              </span>
            )}

            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50 sm:h-11 sm:w-auto sm:px-4"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </motion.header>

        {/* ================= STATS ================= */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:gap-3 lg:mt-8 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            icon={<ShoppingCart className="size-5" />}
            label="Total Orders"
            value={stats.total}
            hint={`${stats.paidCount} paid · ${stats.unpaid} unpaid`}
          />

          <StatCard
            icon={<CreditCard className="size-5" />}
            label="Today's Orders"
            value={stats.ordersToday}
            hint={`${formatNaira(stats.revenueToday)} today`}
            tone="accent"
          />

          <StatCard
            icon={<HandCoins className="size-5" />}
            label="Awaiting Pickup"
            value={stats.awaitingPickup}
            hint="Paid · not collected"
            tone="amber"
          />

          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Collected"
            value={stats.collected}
            hint="Handed over to students"
            tone="green"
          />

          <StatCard
            icon={<CircleDollarSign className="size-5" />}
            label="Total Revenue"
            value={formatNaira(stats.revenue)}
            hint={`${formatNaira(stats.paidCount ? stats.revenue / stats.paidCount : 0)} avg/order`}
            tone="gold"
          />
        </div>

        {/* Quick Metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <MiniQuickMetric
            icon={<Users className="size-4" />}
            label="Students"
            value={stats.totalUsers}
            to="/admin/users"
          />
          <MiniQuickMetric
            icon={<Boxes className="size-4" />}
            label="Components"
            value={stats.totalComponents}
            to="/admin/components"
          />
          <MiniQuickMetric
            icon={<AlertTriangle className="size-4" />}
            label="Low Stock"
            value={stats.lowStock}
            tone={stats.lowStock > 0 ? "amber" : "default"}
            to="/admin/components"
          />
          <MiniQuickMetric
            icon={<Package className="size-4" />}
            label="Out of Stock"
            value={stats.outOfStock}
            tone={stats.outOfStock > 0 ? "rose" : "default"}
            to="/admin/components"
          />
        </div>

        {/* ================= CONTENT ================= */}
        <div className="mt-5 grid gap-4 sm:gap-5 lg:mt-6 lg:grid-cols-3">
          {/* ---------- LATEST ORDERS ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-900/50 p-3 shadow-xl shadow-black/20 sm:p-4 md:p-5 lg:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-white sm:text-lg">
                  <Clock3 className="size-4 shrink-0 text-brand-accent" />
                  Latest Orders
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filter === "all"
                    ? `The ${Math.min(recent.length, 5)} most recent orders`
                    : `${matchingCount} order${matchingCount === 1 ? "" : "s"} · showing the latest ${recent.length}`}
                </p>
              </div>

              <div className="flex w-full shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-0.5 backdrop-blur-sm sm:w-auto">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "awaiting", label: "Awaiting" },
                    { key: "collected", label: "Collected" },
                  ] as { key: OrderFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 sm:flex-none ${
                      filter === f.key
                        ? "bg-brand-accent text-white shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Layers className="size-7 text-slate-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">No orders yet</h3>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  {filter === "all"
                    ? "Paid student orders will appear here as soon as they land."
                    : "No orders match this filter right now."}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2 sm:mt-5">
                {recent.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <OrderRow order={order} imageByComponent={imageByComponent} />
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2.5 border-t border-white/5 pt-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-5">
              <p className="text-xs text-slate-500">
                Hand over paid components from the pickup desk.
              </p>

              <Link
                to="/admin/pickup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-brand-accent/40 hover:bg-brand-accent/10 hover:text-white sm:w-auto sm:px-4 sm:py-2.5"
              >
                Open pickup desk
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.section>

          {/* ---------- RIGHT COLUMN ---------- */}
          <div className="space-y-4 sm:space-y-6">
            {/* PIPELINE */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
              className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-900/50 p-3 sm:p-4 md:p-5 lg:p-6 shadow-xl shadow-black/20"
            >
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-white sm:text-lg">
                <BarChart3 className="size-4 shrink-0 text-brand-accent" />
                Order Pipeline
              </h2>
              <p className="mt-1 text-xs text-slate-500">Where every paid order currently sits</p>

              <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                <PipelineRow
                  label="Awaiting pickup"
                  value={stats.awaitingPickup}
                  total={Math.max(stats.paidCount, 1)}
                  bar="bg-amber-400"
                />
                <PipelineRow
                  label="Collected"
                  value={stats.collected}
                  total={Math.max(stats.paidCount, 1)}
                  bar="bg-emerald-400"
                />
                <PipelineRow
                  label="Unpaid"
                  value={stats.unpaid}
                  total={Math.max(stats.total, 1)}
                  bar="bg-rose-400"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-4 sm:mt-5 sm:gap-2.5 sm:pt-5">
                <MiniStat label="Paid orders" value={stats.paidCount} />
                <MiniStat
                  label="Avg. order"
                  value={formatNaira(stats.paidCount ? stats.revenue / stats.paidCount : 0)}
                />
                <MiniStat label="Orders today" value={stats.ordersToday} />
                <MiniStat
                  label="Revenue today"
                  value={formatNaira(stats.revenueToday)}
                />
              </div>
            </motion.section>

            {/* LOW STOCK */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
              className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-900/50 p-3 sm:p-4 md:p-5 lg:p-6 shadow-xl shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-white sm:text-lg">
                    <AlertTriangle className="size-4 shrink-0 text-brand-gold" />
                    Low Stock Alerts
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {stats.lowStock} component
                    {stats.lowStock !== 1 && "s"} below 10 units
                  </p>
                </div>

                <span className="rounded-xl bg-brand-gold/10 px-2.5 py-1 text-sm font-bold text-brand-gold ring-1 ring-brand-gold/20 sm:px-3 sm:py-1.5">
                  {stats.lowStock}
                </span>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-8 text-center">
                  <CheckCircle2 className="mx-auto size-6 text-emerald-400" />
                  <p className="mt-2 text-sm text-slate-400">Every component is well stocked.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-2.5">
                  {lowStockItems.map((c) => {
                    const img = resolveImage(c.image);
                    const stock = Number(c.stock ?? 0);

                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-2 transition-all duration-200 hover:bg-white/[0.04] sm:gap-3 sm:p-2.5"
                      >
                        <div className="size-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950 sm:size-11">
                          {img ? (
                            <img
                              src={img}
                              alt={c.name}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid size-full place-items-center">
                              <Package className="size-4 sm:size-5 text-slate-700" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500 sm:text-[11px]">
                            {c.sku || "—"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold sm:px-2.5 sm:py-1 ${
                            stock <= 3
                              ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20"
                              : "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20"
                          }`}
                        >
                          {stock} left
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                to="/admin/components"
                className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-lg hover:shadow-brand-accent/20 sm:mt-5"
              >
                Manage inventory
                <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LATEST ORDERS — ROW
   ============================================================ */

function OrderRow({
  order,
  imageByComponent,
}: {
  order: PaymentOrder;
  imageByComponent: Map<string, string>;
}) {
  const stage = stageOf(order);
  const meta = STAGE_META[stage];

  const items = order.items ?? [];
  const unitCount = orderUnitCount(order);
  const total = orderTotal(order);

  const firstItem = items[0];
  const firstLabel = firstItem?.name
    ? items.length > 1
      ? `${firstItem.name} +${items.length - 1} more`
      : firstItem.name
    : "Order items unavailable";

  const reference = order.reference || order.id;

  /* Show up to 3 product thumbnails, then a "+N" chip. */
  const thumbs = items
    .slice(0, 3)
    .map((item) => resolveImage(item.image) ?? imageByComponent.get(item.componentId))
    .filter((src): src is string => Boolean(src));

  const extraItems = Math.max(items.length - 3, 0);

  return (
    <Link
      to="/admin/pickup"
      className="group flex items-start gap-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-2.5 transition-all duration-200 hover:border-brand-accent/40 hover:bg-white/[0.06] hover:shadow-md hover:shadow-black/20 sm:items-center sm:gap-4 sm:p-3"
    >
      {/* THUMBNAILS */}
      <div className="flex shrink-0 -space-x-2 sm:-space-x-2.5">
        {thumbs.length > 0 ? (
          thumbs.map((src, i) => (
            <img
              key={`${order.id}-${i}`}
              src={src}
              alt={firstItem?.name ?? "Component"}
              loading="lazy"
              className="size-10 rounded-xl border-2 border-slate-900 object-cover transition group-hover:border-brand-accent/40 sm:size-11 md:size-12"
            />
          ))
        ) : (
          <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-slate-950 sm:size-11 md:size-12">
            <Package className="size-4 sm:size-5 text-slate-700" />
          </div>
        )}

        {extraItems > 0 && (
          <span className="grid size-10 place-items-center rounded-xl border-2 border-slate-900 bg-slate-800 text-[9px] font-bold text-slate-300 sm:size-11 md:size-12 sm:text-xs">
            +{extraItems}
          </span>
        )}
      </div>

      {/* DETAILS */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-mono text-xs font-semibold text-white sm:text-sm">
            {reference}
          </span>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] sm:text-[10px] ${meta.chip}`}
          >
            <span className={`size-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
          {firstLabel} · {unitCount} unit{unitCount === 1 ? "" : "s"}
        </p>

        {/* AMOUNT — mobile only (on desktop it sits on the right) */}
        <p className="mt-1.5 text-sm font-bold text-white sm:hidden">{formatNaira(total)}</p>
      </div>

      {/* AMOUNT + TIME — desktop */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-bold text-white">{formatNaira(total)}</p>
        <p className="mt-0.5 text-[11px] text-slate-500" title={formatDateTime(order.createdAt)}>
          {timeAgo(order.createdAt)}
        </p>
      </div>

      <ChevronRight className="mt-0.5 hidden size-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-brand-accent sm:mt-0 sm:block" />
    </Link>
  );
}

/* ============================================================
   SMALL PIECES
   ============================================================ */

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "amber" | "accent" | "green" | "gold";
}) {
  const tones: Record<string, { value: string; chip: string }> = {
    default: {
      value: "text-white",
      chip: "bg-white/5 text-slate-400",
    },
    amber: {
      value: "text-amber-300",
      chip: "bg-amber-500/10 text-amber-400",
    },
    accent: {
      value: "text-brand-accent",
      chip: "bg-brand-accent/10 text-brand-accent",
    },
    green: {
      value: "text-emerald-300",
      chip: "bg-emerald-500/10 text-emerald-400",
    },
    gold: {
      value: "text-brand-gold",
      chip: "bg-brand-gold/10 text-brand-gold",
    },
  };

  const t = tones[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-4 shadow-lg transition-all duration-200 hover:border-white/20 hover:shadow-xl hover:shadow-black/20 sm:p-5">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <p className="text-[10px] font-mono uppercase leading-tight tracking-[0.2em] text-slate-500">
            {label}
          </p>

          <div className={`grid size-9 shrink-0 place-items-center rounded-xl shadow-sm ring-1 ring-white/10 backdrop-blur-sm sm:size-10 ${t.chip}`}>
            {icon}
          </div>
        </div>

        <p
          className={`mt-3 break-words text-xl font-bold leading-tight tracking-tight sm:text-2xl lg:text-3xl ${t.value}`}
        >
          {value}
        </p>

        {hint && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 sm:text-[11px]">{hint}</p>}
      </div>
    </div>
  );
}

function PipelineRow({
  label,
  value,
  total,
  bar,
}: {
  label: string;
  value: number;
  total: number;
  bar: string;
}) {
  const pct = Math.min(100, Math.round((value / total) * 100));

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="font-bold text-white">{value} <span className="text-slate-500">({pct}%)</span></span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${bar}`}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 sm:text-[10px]">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-white sm:mt-1 sm:text-sm">{value}</p>
    </div>
  );
}

function MiniQuickMetric({
  icon,
  label,
  value,
  tone = "default",
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "default" | "amber" | "rose" | "accent" | "green" | "gold";
  to: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-white/5 text-slate-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
    accent: "bg-brand-accent/10 text-brand-accent",
    green: "bg-emerald-500/10 text-emerald-400",
    gold: "bg-brand-gold/10 text-brand-gold",
  };

  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] sm:gap-3 sm:p-3"
    >
      <div className={`grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-white/10 backdrop-blur-sm sm:size-9 ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-400">{label}</p>
        <p className="text-sm font-bold text-white sm:text-base">{value}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
    </Link>
  );
}

/* ============================================================
   LOADING SKELETON
   ============================================================ */

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-6 sm:px-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-white/5" />
              <div className="mt-4 h-9 w-64 max-w-full rounded bg-white/5 sm:h-10 sm:w-72" />
              <div className="mt-2 h-4 w-96 max-w-full rounded bg-white/5" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden h-10 w-32 rounded-xl bg-white/5 sm:block" />
              <div className="h-10 w-full rounded-xl bg-white/5 sm:h-11 sm:w-28" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:mt-8 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden h-28 rounded-2xl border border-white/10 bg-white/[0.02] sm:h-32"
              >
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="relative overflow-hidden h-96 rounded-3xl border border-white/10 bg-white/[0.02] lg:col-span-2">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
            </div>
            <div className="space-y-6">
              <div className="relative overflow-hidden h-64 rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
              </div>
              <div className="relative overflow-hidden h-72 rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
