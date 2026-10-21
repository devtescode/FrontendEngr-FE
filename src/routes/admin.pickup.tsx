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
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  usePickupSearch,
  useUpdatePickupStatus,
} from "@/hooks/useAdminQueries";
import { toErrorMessage } from "@/lib/queryClient";
import type { NormalizedOrder } from "@/lib/normalize";

export const Route = createFileRoute("/admin/pickup")({
  head: () => ({
    meta: [{ title: "Student Pickup — Admin" }],
  }),
  component: PickupPage,
});

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

type PickupOrder = NormalizedOrder;

type PendingConfirm = {
  order: PickupOrder;
} | null;

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
  sessionStorage.getItem("admin_token") ||
  sessionStorage.getItem("pulselab_admin_token") ||
  sessionStorage.getItem("pulselab_token");

// =====================================================
// PAGE
// =====================================================

function PickupPage() {
  const [query, setQuery] = useState("");
  // The submitted term drives the query; typing alone never hits the API.
  const [submitted, setSubmitted] = useState("");

  const {
    results: searchResults,
    isLoading: loading,
    isError,
    error: queryError,
  } = usePickupSearch(submitted);

  const updateStatus = useUpdatePickupStatus();

  const searched = submitted.trim().length > 0;
  const results = searched ? searchResults : null;

  const error = isError
    ? toErrorMessage(queryError, "Unable to search orders.")
    : null;

  // Confirmation modal state
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirm>(null);
  const [updating, setUpdating] = useState(false);

  // ===================================================
  // SEARCH
  // ===================================================
  const search = async (e: React.FormEvent) => {
    e.preventDefault();

    const q = query.trim();
    if (!q) {
      return;
    }

    if (q.length < 2) {
      return;
    }

    setSubmitted(q);
  };

  // ===================================================
  // CLEAR
  // ===================================================
  const clearSearch = () => {
    setQuery("");
    setSubmitted("");
  };

  // ===================================================
  // REQUEST STATUS CHANGE
  // ===================================================
  const requestHandover = (order: PickupOrder) => {
    setPendingConfirm({ order });
  };

  // ===================================================
  // CONFIRM HANDOVER
  // ===================================================
  const confirmHandover = async () => {
    if (!pendingConfirm) return;

    const { order } = pendingConfirm;

    setUpdating(true);

    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        status: "Collected",
      });

      setPendingConfirm(null);
    } catch (err: unknown) {
      console.error("Update status failed:", err);
      alert(toErrorMessage(err, "Failed to update status"));
    } finally {
      setUpdating(false);
    }
  };

  // ===================================================
  // ESC KEY CLOSES MODAL
  // ===================================================
  useEffect(() => {
    if (!pendingConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !updating) {
        setPendingConfirm(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingConfirm, updating]);

  // ===================================================
  // BODY SCROLL LOCK
  // ===================================================
  useEffect(() => {
    if (pendingConfirm) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [pendingConfirm]);

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
            Search by full matric number, the last 4 digits of the
            matric, or the order reference. Confirm the student
            before handing over their components.
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
                placeholder="Matric number, last 4 digits, or reference..."
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
              Full: 2023/CSC/001
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Last 4: C001
            </span>
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Ref: EUH-...
            </span>
          </div>
        </div>

        {/* RESULTS */}
        <AnimatePresence mode="wait">
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
                <StudentProfileCard orders={results} />

                {results.map((order) => (
                  <PickupOrderCard
                    key={order.id}
                    order={order}
                    onRequestHandover={requestHandover}
                  />
                ))}
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}
      <AnimatePresence>
        {pendingConfirm && (
          <>
            {/* BLURRED BACKDROP */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.25 }}
              onClick={() => {
                if (!updating) setPendingConfirm(null);
              }}
              className="fixed inset-0 z-50 bg-slate-950/60"
            />

            {/* MODAL */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                key="modal"
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.94 }}
                transition={{
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
              >
                <ConfirmHandoverContent
                  order={pendingConfirm.order}
                  updating={updating}
                  onCancel={() => setPendingConfirm(null)}
                  onConfirm={confirmHandover}
                />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =====================================================
   CONFIRM MODAL CONTENT
===================================================== */

function ConfirmHandoverContent({
  order,
  updating,
  onCancel,
  onConfirm,
}: {
  order: PickupOrder;
  updating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const totalUnits = order.items.reduce(
    (a, i) => a + i.quantity,
    0
  );

  return (
    <div>
      {/* CLOSE BUTTON */}
      <button
        type="button"
        onClick={onCancel}
        disabled={updating}
        className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>

      <div className="p-6">
        {/* ICON */}
        <div className="mb-5 flex justify-center">
          <motion.div
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.05,
              type: "spring",
              stiffness: 320,
              damping: 20,
            }}
            className="grid size-16 place-items-center rounded-full bg-amber-500/10 ring-4 ring-amber-500/20"
          >
            <AlertTriangle className="size-8 text-amber-400" />
          </motion.div>
        </div>

        {/* TITLE */}
        <h2 className="text-center text-xl font-bold text-white">
          Confirm hand over
        </h2>

        <p className="mt-2 text-center text-sm text-slate-400">
          Please verify the student details below before
          handing over the components. This action will mark
          the order as <span className="font-semibold text-white">Collected</span> and
          cannot be undone.
        </p>

        {/* STUDENT CONFIRMATION CARD */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent">
              <User className="size-6" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Confirm student is
              </p>
              <p className="mt-0.5 truncate text-lg font-bold text-white">
                {order.userName || "Unknown"}
              </p>
              {order.matric && (
                <p className="mt-0.5 font-mono text-sm font-semibold text-brand-accent">
                  {order.matric}
                </p>
              )}
            </div>
          </div>

          {/* ORDER SUMMARY */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Reference
              </p>
              <p className="mt-1 truncate font-mono text-xs text-slate-300">
                {order.reference}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Total paid
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {formatNaira(order.total)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Items
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {totalUnits} {totalUnits === 1 ? "unit" : "units"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Paid on
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {formatDateTime(order.paidAt)}
              </p>
            </div>
          </div>
        </div>

        {/* WARNING */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200/90">
            Only click "Confirm" if you are physically
            handing over the components to this student right
            now.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={updating}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-green-500 font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Yes, Confirm
              </>
            )}
          </button>
        </div>
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

  const distinctStudents = new Set(
    orders.map((o) => o.userId).filter(Boolean)
  ).size;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
            <User className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              {distinctStudents > 1 ? "Students" : "Student"}
            </p>

            <h2 className="mt-1 truncate text-xl font-bold text-white">
              {distinctStudents > 1
                ? `${distinctStudents} matched`
                : first.userName || "Unknown"}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {distinctStudents === 1 && first.matric && (
                <span className="font-semibold text-brand-accent">
                  {first.matric}
                </span>
              )}
              {distinctStudents === 1 && first.email && (
                <span className="text-slate-500">{first.email}</span>
              )}
              {distinctStudents > 1 && (
                <span className="text-slate-500">
                  Multiple students match this search — check
                  each order's matric below.
                </span>
              )}
            </div>
          </div>
        </div>

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
  onRequestHandover,
}: {
  order: PickupOrder;
  onRequestHandover: (order: PickupOrder) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const isCollected = order.status === "Collected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-3xl border shadow-xl transition-colors ${
        isCollected
          ? "border-white/5 bg-slate-900/40"
          : "border-white/10 bg-slate-900/70"
      }`}
    >
      {/* HEADER */}
      <div
        className={`border-b p-5 md:p-6 ${
          isCollected
            ? "border-white/5 bg-white/[0.01]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Package
                className={`h-4 w-4 shrink-0 ${
                  isCollected
                    ? "text-slate-600"
                    : "text-brand-accent"
                }`}
              />

              <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                Order Reference
              </span>
            </div>

            <button
              onClick={copyRef}
              className={`mt-1.5 inline-flex items-center gap-2 font-mono text-sm font-semibold transition ${
                isCollected
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-white hover:text-brand-accent"
              }`}
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
      <div
        className={`grid gap-4 border-b p-5 sm:grid-cols-3 md:p-6 ${
          isCollected ? "border-white/5" : "border-white/10"
        }`}
      >
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
                      className={`h-full w-full object-cover ${
                        isCollected ? "grayscale" : ""
                      }`}
                    />
                  ) : (
                    <Package className="h-6 w-6 text-slate-700" />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`truncate font-semibold ${
                      isCollected ? "text-slate-400" : "text-white"
                    }`}
                  >
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

              <div
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
                  isCollected
                    ? "bg-slate-800 text-slate-400"
                    : "bg-brand-accent/10 text-brand-accent"
                }`}
              >
                × {item.quantity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div
        className={`border-t p-5 md:p-6 ${
          isCollected
            ? "border-white/5 bg-white/[0.01]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        {isCollected ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800/60 px-4 py-4 text-sm font-medium text-slate-400">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            This order has already been handed over
          </div>
        ) : (
          <button
            onClick={() => onRequestHandover(order)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-bold text-white transition hover:bg-green-600 active:scale-[0.99]"
          >
            <CheckCircle2 className="h-5 w-5" />
            Hand Over to Student
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
  const isCollected = status === "Collected";

  const styles = isCollected
    ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
    : "bg-green-500/10 text-green-400 border-green-500/20";

  const label = isCollected ? "Collected" : "Ready";

  return (
    <span
      className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider ${styles}`}
    >
      {label}
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