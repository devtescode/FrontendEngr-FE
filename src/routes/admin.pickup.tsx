import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  XCircle,
  Package,
  User,
  Hash,
  ShoppingBag,
  Loader2,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  Receipt,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/pickup")({
  head: () => ({
    meta: [{ title: "Student Pickup — Admin" }],
  }),
  component: PickupPage,
});

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

// =====================================================
// TYPES
// =====================================================

type PickupItem = {
  componentId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  sku?: string | null;
};

type PickupOrder = {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  matric: string;
  email: string | null;
  items: PickupItem[];
  total: number;
  currency: string;
  channel: string | null;
  paidAt: string;
  createdAt: string;
  status: "Paid" | "Ready" | "Collected";
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

const formatDateTime = (iso: string) => {
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

const getToken = () =>
  sessionStorage.getItem("admin_token") 

// =====================================================
// PAGE
// =====================================================

function PickupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickupOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // ===================================================
  // SEARCH
  // ===================================================
  const search = async (e: React.FormEvent) => {
    e.preventDefault();

    const q = query.trim();
    if (!q) {
      setError("Please enter a matric number or order reference.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setSearched(true);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Please log in as admin.");
      }

      const url = `${API_URL}/admin/pickup/search?q=${encodeURIComponent(
        q
      )}`;

      console.log("🔍 Pickup search:", url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(
          `Search endpoint returned non-JSON (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Search failed. Please try again."
        );
      }

      const orders: PickupOrder[] = Array.isArray(data?.orders)
        ? data.orders
        : [];

      setResults(orders);
    } catch (err: any) {
      console.error("🔴 Pickup search failed:", err);
      setError(err?.message || "Unable to search orders.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // CLEAR
  // ===================================================
  const clearSearch = () => {
    setQuery("");
    setResults(null);
    setError(null);
    setSearched(false);
  };

  // ===================================================
  // UPDATE STATUS (optimistic)
  // ===================================================
  const updateStatus = async (
    orderId: string,
    newStatus: PickupOrder["status"]
  ) => {
    const token = getToken();
    if (!token) {
      alert("Please log in as admin.");
      return;
    }

    // Optimistic update
    setResults((prev) =>
      prev
        ? prev.map((o) =>
            o.id === orderId ? { ...o, status: newStatus } : o
          )
        : prev
    );

    try {
      const response = await fetch(
        `${API_URL}/admin/pickup/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Failed to update status");
      }
    } catch (err: any) {
      console.error("Update status failed:", err);
      alert(err?.message || "Failed to update status");

      // Revert on failure
      setResults((prev) =>
        prev
          ? prev.map((o) =>
              o.id === orderId
                ? { ...o, status: "Paid" }
                : o
            )
          : prev
      );
    }
  };

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-accent">
            <ShoppingBag className="h-4 w-4" />
            Student Pickup
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Find Paid Orders
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Search by student matric number or by order
            reference to view paid orders and hand over
            components.
          </p>
        </div>

        {/* SEARCH CARD */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">
          <form
            onSubmit={search}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Matric number or order reference..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950 pl-12 pr-4 text-base font-medium text-white outline-none placeholder:text-slate-600 transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-accent px-7 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Search
                </>
              )}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" />
              2023/CSC/001
            </span>
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              EUH-11223904-...
            </span>
          </div>
        </div>

        {/* RESULTS */}
        <AnimatePresence mode="wait">
          {/* ERROR */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 rounded-3xl border border-red-500/20 bg-red-500/5 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div>
                  <p className="font-semibold text-red-300">
                    Search failed
                  </p>
                  <p className="mt-1 text-sm text-red-400/80">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* NOT FOUND */}
          {!loading &&
            !error &&
            searched &&
            Array.isArray(results) &&
            results.length === 0 && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl border border-slate-500/20 bg-slate-500/5 p-8"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-500/10">
                    <XCircle className="h-8 w-8 text-slate-400" />
                  </div>

                  <h2 className="text-lg font-bold text-white">
                    No paid orders found
                  </h2>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    No paid order matches{" "}
                    <span className="font-semibold text-slate-300">
                      "{query}"
                    </span>
                    . Check the matric number or reference and
                    try again.
                  </p>

                  <button
                    onClick={clearSearch}
                    className="mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Search Again
                  </button>
                </div>
              </motion.div>
            )}

          {/* ORDERS FOUND */}
          {!loading &&
            !error &&
            Array.isArray(results) &&
            results.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                {/* STUDENT PROFILE */}
                <StudentProfileCard orders={results} />

                {/* ORDER CARDS */}
                {results.map((order) => (
                  <PickupOrderCard
                    key={order.id}
                    order={order}
                    updateStatus={updateStatus}
                  />
                ))}
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* =====================================================
   STUDENT PROFILE
===================================================== */

function StudentProfileCard({ orders }: { orders: PickupOrder[] }) {
  const first = orders[0];

  const totalSpent = orders.reduce((a, o) => a + o.total, 0);
  const totalUnits = orders.reduce(
    (a, o) => a + o.items.reduce((b, i) => b + i.quantity, 0),
    0
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* STUDENT */}
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
            <User className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              Student
            </p>

            <h2 className="mt-1 truncate text-xl font-bold text-white">
              {first.userName || "Unknown"}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {first.matric && (
                <span className="font-semibold text-brand-accent">
                  {first.matric}
                </span>
              )}
              {first.email && (
                <span className="text-slate-500">
                  {first.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Orders" value={String(orders.length)} />
          <StatPill label="Items" value={String(totalUnits)} />
          <StatPill
            label="Total Spent"
            value={formatNaira(totalSpent)}
            highlight
          />
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-2.5 text-center ${
        highlight
          ? "border-brand-accent/20 bg-brand-accent/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${
          highlight ? "text-brand-accent" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =====================================================
   ORDER CARD
===================================================== */

function PickupOrderCard({
  order,
  updateStatus,
}: {
  order: PickupOrder;
  updateStatus: (
    id: string,
    status: PickupOrder["status"]
  ) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl"
    >
      {/* HEADER */}
      <div className="border-b border-white/10 bg-white/[0.02] p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-brand-accent" />

              <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                Order Reference
              </span>
            </div>

            <button
              onClick={copyRef}
              className="mt-1.5 inline-flex items-center gap-2 font-mono text-sm font-semibold text-white transition hover:text-brand-accent"
            >
              <span className="truncate max-w-[280px]">
                {order.reference}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              )}
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(order.paidAt)}
              </span>

              {order.channel && (
                <span className="inline-flex items-center gap-1 capitalize">
                  {order.channel === "card" ? (
                    <CreditCard className="h-3 w-3" />
                  ) : (
                    <Building2 className="h-3 w-3" />
                  )}
                  {order.channel.replace("_", " ")}
                </span>
              )}
            </div>
          </div>

          <OrderStatus status={order.status} />
        </div>
      </div>

      {/* META GRID */}
      <div className="grid gap-4 border-b border-white/10 p-5 sm:grid-cols-3 md:p-6">
        <Info label="Student" value={order.userName || "—"} />
        <Info label="Matric Number" value={order.matric || "—"} />
        <Info label="Order Total" value={formatNaira(order.total)} />
      </div>

      {/* PRODUCTS */}
      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white">Ordered Products</h4>
            <p className="mt-1 text-xs text-slate-500">
              {order.items.length} product
              {order.items.length !== 1 && "s"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div
              key={`${order.id}-${idx}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/70 p-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-slate-700" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {item.name}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    {item.sku && (
                      <>
                        <span className="font-mono">{item.sku}</span>
                        <span className="text-slate-700">•</span>
                      </>
                    )}
                    <span>{formatNaira(item.price)} each</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-xl bg-brand-accent/10 px-3 py-2 text-sm font-bold text-brand-accent">
                × {item.quantity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER — PICKUP ACTION */}
      <div className="border-t border-white/10 bg-white/[0.02] p-5 md:p-6">
        {order.status === "Ready" && (
          <button
            onClick={() => updateStatus(order.id, "Collected")}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-bold text-white transition hover:bg-green-600"
          >
            <CheckCircle2 className="h-5 w-5" />
            Hand Over & Mark as Collected
          </button>
        )}

        {order.status === "Collected" && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 text-sm font-medium text-slate-400">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            This order has already been collected
          </div>
        )}

        {order.status === "Paid" && (
          <button
            onClick={() => updateStatus(order.id, "Ready")}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand-accent font-bold text-white transition hover:opacity-90"
          >
            <Package className="h-5 w-5" />
            Mark as Ready for Pickup
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* =====================================================
   STATUS
===================================================== */

function OrderStatus({ status }: { status: PickupOrder["status"] }) {
  const styles =
    status === "Ready"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : status === "Collected"
        ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
        : "bg-brand-accent/10 text-brand-accent border-brand-accent/20";

  return (
    <span
      className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider ${styles}`}
    >
      {status}
    </span>
  );
}

/* =====================================================
   INFO
===================================================== */

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}