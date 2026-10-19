import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
  Server,
  Wallet,
  Clock3,
  CheckCircle2,
  HandCoins,
  CircleDollarSign,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Layers,
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4500";

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

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(then).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
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

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed lg:static z-50 top-0 left-0 min-h-screen w-64
          border-r border-white/5 bg-slate-950 flex flex-col
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between border-b border-white/5 p-6">
          <div>
            <Logo className="text-white" />
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Admin Console
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-brand-accent/15 text-brand-accent"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/5 p-3">
          {/* BACKEND STATUS */}
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
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
          </div>

          <button
            onClick={() => {
              logout();
              navigate({ to: "/admin/login" });
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto transition-all">
        <div className="flex items-center gap-3 border-b border-white/5 bg-slate-950 p-4 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-white/5 p-2 hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">Admin</span>
        </div>
        {children}
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

    return {
      total: orders.length,
      paidCount: paidOrders.length,
      /* paid, but the student has not collected it yet */
      awaitingPickup: paidOrders.filter((o) => !isCollected(o)).length,
      ready: paidOrders.filter((o) => isReady(o)).length,
      collected: paidOrders.filter((o) => isCollected(o)).length,
      unpaid: orders.length - paidOrders.length,
      revenue,
      lowStock: components.filter((c) => Number(c?.stock ?? 0) < 10).length,
    };
  }, [orders, components]);

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
    <div className="min-h-screen bg-slate-950 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ================= HEADER ================= */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-brand-accent">
              <Server className="size-4" />
              Engr-BE · Admin Console
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Operations Overview
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Live view of paid orders, hand-overs and stock levels for the Elizade University
              hardware hub.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-slate-500 sm:block">
                Synced {timeAgo(lastUpdated.toISOString())}
              </span>
            )}

            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </motion.header>

        {/* ================= STATS ================= */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard
            icon={<Wallet className="size-5" />}
            label="Total Orders"
            value={stats.total}
            hint={`${stats.paidCount} paid · ${stats.unpaid} unpaid`}
          />

          <StatCard
            icon={<HandCoins className="size-5" />}
            label="Paid, Not Collected"
            value={stats.awaitingPickup}
            hint="Paid · awaiting hand-over"
            tone="amber"
          />

          {/* <StatCard
            icon={<PackageCheck className="size-5" />}
            label="Ready for Pickup"
            value={stats.ready}
            hint="Prepared & waiting"
            tone="accent"
          /> */}

          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Collected"
            value={stats.collected}
            hint="Handed over to students"
            tone="green"
          />

          <StatCard
            icon={<CircleDollarSign className="size-5" />}
            label="Revenue"
            value={formatNaira(stats.revenue)}
            hint="From paid orders"
            tone="gold"
          />
        </div>

        {/* ================= CONTENT ================= */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* ---------- LATEST ORDERS ---------- */}
          <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Clock3 className="size-4 text-brand-accent" />
                  Latest Orders
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filter === "all"
                    ? `The ${Math.min(recent.length, 5)} most recent orders`
                    : `${matchingCount} order${matchingCount === 1 ? "" : "s"} · showing the latest ${recent.length}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      filter === f.key
                        ? "bg-brand-accent text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-white/5">
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
              <div className="mt-5 space-y-2.5">
                {recent.map((order) => (
                  <OrderRow key={order.id} order={order} imageByComponent={imageByComponent} />
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Hand over paid components from the pickup desk.
              </p>

              <Link
                to="/admin/pickup"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-brand-accent/40 hover:bg-brand-accent/10 hover:text-white"
              >
                Open pickup desk
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </section>

          {/* ---------- RIGHT COLUMN ---------- */}
          <div className="space-y-6">
            {/* PIPELINE */}
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl md:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Package className="size-4 text-brand-accent" />
                Order Pipeline
              </h2>
              <p className="mt-1 text-xs text-slate-500">Where every paid order currently sits</p>

              <div className="mt-5 space-y-4">
                <PipelineRow
                  label="Paid · not collected"
                  value={stats.awaitingPickup}
                  total={Math.max(stats.paidCount, 1)}
                  bar="bg-amber-400"
                />
                {/* <PipelineRow
                  label="Ready for pickup"
                  value={stats.ready}
                  total={Math.max(stats.paidCount, 1)}
                  bar="bg-brand-accent"
                /> */}
                <PipelineRow
                  label="Collected"
                  value={stats.collected}
                  total={Math.max(stats.paidCount, 1)}
                  bar="bg-emerald-400"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-5">
                <MiniStat label="Paid orders" value={stats.paidCount} />
                <MiniStat
                  label="Avg. order"
                  value={formatNaira(stats.paidCount ? stats.revenue / stats.paidCount : 0)}
                />
              </div>
            </section>

            {/* LOW STOCK */}
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <AlertTriangle className="size-4 text-brand-gold" />
                    Low Stock Alerts
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {stats.lowStock} component
                    {stats.lowStock !== 1 && "s"} below 10 units
                  </p>
                </div>

                <span className="rounded-xl bg-brand-gold/10 px-3 py-1.5 text-sm font-bold text-brand-gold">
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
                        className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-2.5"
                      >
                        <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                          {img ? (
                            <img
                              src={img}
                              alt={c.name}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid size-full place-items-center">
                              <Package className="size-5 text-slate-700" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">{c.sku}</p>
                        </div>

                        <span
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                            stock <= 3
                              ? "bg-rose-500/10 text-rose-300"
                              : "bg-amber-500/10 text-amber-300"
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
                className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Manage inventory
                <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            </section>
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
      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-brand-accent/30 hover:bg-white/[0.05]"
    >
      {/* THUMBNAILS */}
      <div className="flex shrink-0 -space-x-3">
        {thumbs.length > 0 ? (
          thumbs.map((src, i) => (
            <img
              key={`${order.id}-${i}`}
              src={src}
              alt={firstItem?.name ?? "Component"}
              loading="lazy"
              className="size-12 rounded-xl border-2 border-slate-900 object-cover transition group-hover:border-brand-accent/40"
            />
          ))
        ) : (
          <div className="grid size-12 place-items-center rounded-xl border border-white/10 bg-slate-950">
            <Package className="size-5 text-slate-700" />
          </div>
        )}

        {extraItems > 0 && (
          <span className="grid size-12 place-items-center rounded-xl border-2 border-slate-900 bg-slate-800 text-xs font-bold text-slate-300">
            +{extraItems}
          </span>
        )}
      </div>

      {/* DETAILS */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-mono text-sm font-semibold text-white">{reference}</span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}
          >
            <span className={`size-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        <p className="mt-1 truncate text-xs text-slate-500">
          {firstLabel} · {unitCount} unit{unitCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* AMOUNT + TIME */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-bold text-white">{formatNaira(total)}</p>
        <p className="mt-0.5 text-[11px] text-slate-500" title={formatDateTime(order.createdAt)}>
          {timeAgo(order.createdAt)}
        </p>
      </div>

      <ChevronRight className="size-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-brand-accent" />
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
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</p>

        <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${t.chip}`}>{icon}</div>
      </div>

      <p className={`mt-3 text-2xl font-bold tracking-tight ${t.value}`}>{value}</p>

      {hint && <p className="mt-1 truncate text-[11px] text-slate-500">{hint}</p>}
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
        <span className="font-bold text-white">{value}</span>
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
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

/* ============================================================
   LOADING SKELETON
   ============================================================ */

function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-40 rounded bg-white/5" />
        <div className="mt-4 h-10 w-72 rounded bg-white/5" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-white/5" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="h-96 rounded-3xl border border-white/5 bg-white/[0.03] lg:col-span-2" />
          <div className="h-96 rounded-3xl border border-white/5 bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}
