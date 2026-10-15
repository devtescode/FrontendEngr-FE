import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageCheck,
  Search,
  Loader2,
  AlertCircle,
  Package,
  User,
  Hash,
  Calendar,
  Receipt,
  CreditCard,
  Building2,
  Copy,
  Check,
  TrendingUp,
  Users,
  Clock,
  ChevronDown,
  XCircle,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/admin/collected")({
  head: () => ({
    meta: [{ title: "Collected Orders — Admin" }],
  }),
  component: CollectedPage,
});

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

// =====================================================
// TYPES
// =====================================================

type CollectedItem = {
  componentId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  sku?: string | null;
};

type CollectedOrder = {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  matric: string;
  email: string | null;
  items: CollectedItem[];
  total: number;
  currency: string;
  channel: string | null;
  paidAt: string;
  createdAt: string;
  collectedAt: string | null;
  status: "Collected";
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

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getToken = () =>
  sessionStorage.getItem("admin_token") ||
  sessionStorage.getItem("pulselab_admin_token") ||
  sessionStorage.getItem("pulselab_token");

// =====================================================
// PAGE
// =====================================================

function CollectedPage() {
  const [orders, setOrders] = useState<CollectedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest" | "highest">(
    "recent"
  );

  // ===================================================
  // LOAD
  // ===================================================
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const token = getToken();
      if (!token) {
        setError("Please log in as admin.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_URL}/admin/pickup/collected`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const rawText = await response.text();
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          throw new Error(
            `Endpoint returned non-JSON (HTTP ${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message || "Unable to load collected orders."
          );
        }

        const list: CollectedOrder[] = Array.isArray(data?.orders)
          ? data.orders
          : [];

        if (!cancelled) setOrders(list);
      } catch (err: any) {
        if (!cancelled) {
          console.error("🔴 Load collected failed:", err);
          setError(err?.message || "Unable to load collected orders.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================================
  // STATS
  // ===================================================
  const stats = useMemo(() => {
    const totalValue = orders.reduce((a, o) => a + o.total, 0);
    const totalItems = orders.reduce(
      (a, o) => a + o.items.reduce((b, i) => b + i.quantity, 0),
      0
    );
    const uniqueStudents = new Set(orders.map((o) => o.userId)).size;

    return {
      count: orders.length,
      students: uniqueStudents,
      items: totalItems,
      value: totalValue,
    };
  }, [orders]);

  // ===================================================
  // FILTER + SORT
  // ===================================================
  const visible = useMemo(() => {
    let result = orders;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const hay = [
          o.reference,
          o.userName,
          o.matric,
          o.email ?? "",
          ...o.items.map((i) => i.name),
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      });
    }

    result = [...result].sort((a, b) => {
      if (sort === "recent") {
        const at = new Date(a.collectedAt || a.paidAt).getTime();
        const bt = new Date(b.collectedAt || b.paidAt).getTime();
        return bt - at;
      }
      if (sort === "oldest") {
        const at = new Date(a.collectedAt || a.paidAt).getTime();
        const bt = new Date(b.collectedAt || b.paidAt).getTime();
        return at - bt;
      }
      // highest
      return b.total - a.total;
    });

    return result;
  }, [orders, query, sort]);

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-400">
            <PackageCheck className="h-4 w-4" />
            Collected Orders
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Handover History
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Every order that has been handed over to a student.
            Search by student, order reference, or component
            name.
          </p>
        </div>

        {/* STATS */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<PackageCheck className="h-5 w-5" />}
              label="Total Collected"
              value={String(stats.count)}
              accent="green"
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Students Served"
              value={String(stats.students)}
              accent="blue"
            />
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Components Handed"
              value={String(stats.items)}
              accent="purple"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Value"
              value={formatNaira(stats.value)}
              accent="gold"
            />
          </div>
        )}

        {/* SEARCH + SORT */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by student, matric, reference, or component..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-green-400/50 focus:ring-2 focus:ring-green-400/10"
              />

              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear search"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as typeof sort)
                }
                className="h-12 appearance-none rounded-2xl border border-white/10 bg-slate-900/70 pl-10 pr-10 text-sm font-medium text-white outline-none transition focus:border-green-400/50 focus:ring-2 focus:ring-green-400/10"
              >
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest value</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <CollectedSkeleton key={i} index={i} />
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <p className="font-semibold text-red-300">
              Couldn't load collected orders
            </p>
            <p className="mt-1 text-sm text-red-400/80">{error}</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-16 text-center">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-green-500/10">
              <PackageCheck className="h-8 w-8 text-green-400/60" />
            </div>
            <h2 className="text-xl font-bold text-white">
              No orders collected yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Once you hand over orders from the pickup page,
              they'll appear here.
            </p>
          </div>
        )}

        {/* NO MATCH FOR SEARCH */}
        {!loading &&
          !error &&
          orders.length > 0 &&
          visible.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-12 text-center">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-500/10">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                No matches
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No collected order matches "{query}".
              </p>
              <button
                onClick={() => setQuery("")}
                className="mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Clear search
              </button>
            </div>
          )}

        {/* LIST */}
        {!loading && !error && visible.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visible.map((order, index) => (
                <CollectedRow
                  key={order.id}
                  order={order}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "green" | "blue" | "purple" | "gold";
}) {
  const accents = {
    green:
      "border-green-500/20 bg-green-500/5 text-green-400",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    purple:
      "border-purple-500/20 bg-purple-500/5 text-purple-400",
    gold: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-5 ${accents[accent]}`}
    >
      <div className="flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-white/[0.04]">
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
          {label}
        </span>
      </div>

      <div className="mt-4 text-2xl font-bold text-white">
        {value}
      </div>
    </motion.div>
  );
}

/* =====================================================
   ROW
===================================================== */

function CollectedRow({
  order,
  index,
}: {
  order: CollectedOrder;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalUnits = order.items.reduce(
    (a, i) => a + i.quantity,
    0
  );

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ delay: index * 0.03 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl transition-colors hover:border-green-500/20"
    >
      {/* ============================================
          SUMMARY ROW (always visible)
      ============================================ */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-white/[0.02] sm:flex-row sm:items-center md:p-6"
      >
        {/* ICON + USER */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-green-500/10 text-green-400">
            <PackageCheck className="size-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-green-400 ring-1 ring-green-500/20">
                <Check className="size-3" />
                Collected
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                {formatDate(order.collectedAt || order.paidAt)}
              </span>
            </div>

            <div className="mt-1.5 truncate text-base font-bold text-white">
              {order.userName || "Unknown"}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {order.matric && (
                <span className="font-mono font-semibold text-brand-accent">
                  {order.matric}
                </span>
              )}
              <span className="font-mono truncate max-w-[220px]">
                {order.reference}
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE STATS */}
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Items
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {totalUnits}{" "}
              {totalUnits === 1 ? "unit" : "units"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Total
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {formatNaira(order.total)}
            </p>
          </div>
        </div>

        {/* CHEVRON */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-400"
        >
          <ChevronDown className="size-4" />
        </motion.div>
      </button>

      {/* ============================================
          EXPANDED DETAILS
      ============================================ */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="bg-white/[0.02] p-5 md:p-6">
              {/* META GRID */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetaCell
                  icon={<User className="h-3.5 w-3.5" />}
                  label="Student"
                  value={order.userName || "—"}
                />
                <MetaCell
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Matric"
                  value={order.matric || "—"}
                />
                <MetaCell
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="Collected At"
                  value={formatDateTime(
                    order.collectedAt
                  )}
                />
                <MetaCell
                  icon={
                    order.channel === "card" ? (
                      <CreditCard className="h-3.5 w-3.5" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5" />
                    )
                  }
                  label="Payment"
                  value={
                    order.channel
                      ? order.channel.replace("_", " ")
                      : "—"
                  }
                />
              </div>

              {/* REFERENCE */}
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                <Receipt className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Order Reference
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-white">
                    {order.reference}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyRef();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* ITEMS */}
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  <Package className="h-3.5 w-3.5" />
                  Components Handed Over ({order.items.length})
                </div>

                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={`${order.id}-${idx}`}
                      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/70 p-3"
                    >
                      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-slate-700" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {item.name}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                          {item.sku && (
                            <>
                              <span className="font-mono">
                                {item.sku}
                              </span>
                              <span className="text-slate-700">•</span>
                            </>
                          )}
                          <span>
                            {formatNaira(item.price)} each
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300">
                        × {item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CONFIRMATION FOOTER */}
              <div className="mt-5 flex items-start gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                <p className="text-xs text-green-200/90">
                  This order was confirmed handed over. If this
                  was done in error, contact support.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* =====================================================
   META CELL
===================================================== */

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

/* =====================================================
   SKELETON
===================================================== */

function CollectedSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6"
    >
      <div className="flex items-center gap-4">
        <div className="size-12 shrink-0 animate-pulse rounded-2xl bg-white/5" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
        </div>
        <div className="size-9 shrink-0 animate-pulse rounded-xl bg-white/5" />
      </div>
    </motion.div>
  );
}