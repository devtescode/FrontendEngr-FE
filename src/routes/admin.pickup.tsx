import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  Package,
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
  Mail,
  Users,
  Clock,
  SearchX,
  ScanSearch,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StudentAvatar } from "@/components/StudentAvatar";
import { usePickupSearch, useUpdatePickupStatus } from "@/hooks/useAdminQueries";
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

type PickupOrder = NormalizedOrder;

type PendingConfirm = {
  order: PickupOrder;
} | null;

type StudentGroup = {
  key: string;
  name: string;
  matric: string;
  email: string | null;
  image: string | null;
  orders: PickupOrder[];
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

const unitsOf = (order: PickupOrder) => order.items.reduce((a, i) => a + i.quantity, 0);

const isCollectedOrder = (order: PickupOrder) => order.status === "Collected";

/** Groups orders by student, keeping the order in which students first appear. */
const groupByStudent = (orders: PickupOrder[]): StudentGroup[] => {
  const groups = new Map<string, StudentGroup>();

  for (const order of orders) {
    const key =
      order.userId || order.matric || order.email || order.userName || `order-${order.id}`;

    const existing = groups.get(key);
    if (existing) {
      existing.orders.push(order);
      if (!existing.image && order.userImage) existing.image = order.userImage;
      if (!existing.email && order.email) existing.email = order.email;
      continue;
    }

    groups.set(key, {
      key,
      name: order.userName || "Unknown student",
      matric: order.matric,
      email: order.email,
      image: order.userImage,
      orders: [order],
    });
  }

  return Array.from(groups.values());
};

const summarize = (orders: PickupOrder[]) => {
  const pending = orders.filter((o) => !isCollectedOrder(o));
  return {
    orderCount: orders.length,
    units: orders.reduce((a, o) => a + unitsOf(o), 0),
    totalPaid: orders.reduce((a, o) => a + o.total, 0),
    pendingValue: pending.reduce((a, o) => a + o.total, 0),
    pendingCount: pending.length,
    collectedCount: orders.length - pending.length,
  };
};

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

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

  const error = isError ? toErrorMessage(queryError, "Unable to search orders.") : null;

  const groups = useMemo(() => (results ? groupByStudent(results) : []), [results]);

  // Confirmation modal state
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
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
  // LIVE ANNOUNCEMENT
  // ===================================================
  let announcement = "";
  if (searched) {
    if (loading) {
      announcement = `Searching orders for ${submitted}…`;
    } else if (error) {
      announcement = `Search failed: ${error}`;
    } else if (results && results.length === 0) {
      announcement = `No orders found for ${submitted}.`;
    } else if (results && results.length > 0) {
      announcement =
        groups.length === 1
          ? `Found ${results.length} order${results.length === 1 ? "" : "s"} for ${groups[0].name}.`
          : `Found ${results.length} orders across ${groups.length} students.`;
    }
  }

  const showEmpty =
    searched && !loading && !error && Array.isArray(results) && results.length === 0;
  const showResults = !loading && !error && Array.isArray(results) && results.length > 0;

  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-accent">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Student Pickup
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Find Paid Orders
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Search by full matric number, the last 4 digits of the matric, or the order reference.
            Confirm the student before handing over their components.
          </p>
        </div>

        {/* SEARCH CARD */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">
          <form
            onSubmit={search}
            role="search"
            aria-label="Search paid orders"
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <label htmlFor="pickup-search" className="sr-only">
                Matric number, last 4 digits, or order reference
              </label>

              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />

              <input
                id="pickup-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Matric number, last 4 digits, or reference..."
                autoComplete="off"
                spellCheck={false}
                minLength={2}
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950 pl-12 pr-12 text-base font-medium text-white outline-none placeholder:text-slate-600 transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 [&::-webkit-search-cancel-button]:hidden"
                autoFocus
              />

              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className={`absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white ${focusRing}`}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-accent px-7 font-semibold text-white transition hover:opacity-90 disabled:opacity-60 ${focusRing}`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  Search
                </>
              )}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" aria-hidden="true" />
              Full: 2023/CSC/001
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" aria-hidden="true" />
              Last 4: C001
            </span>
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3 w-3" aria-hidden="true" />
              Ref: EUH-...
            </span>
          </div>
        </div>

        {/* SCREEN-READER ANNOUNCEMENT */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        {/* RESULTS */}
        <section aria-label="Search results">
          {!searched && <InitialState />}

          {searched && loading && <LoadingState term={submitted} />}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mb-5 rounded-3xl border border-red-500/20 bg-red-500/5 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-red-300">Search failed</p>
                  <p className="mt-1 text-sm text-red-400/80">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {showEmpty && <EmptyState term={submitted} onClear={clearSearch} />}

          {showResults && results && (
            <motion.div
              key={`results-${submitted}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {groups.length === 1 ? (
                <>
                  <StudentProfileCard group={groups[0]} />

                  <OrderList orders={groups[0].orders} onRequestHandover={requestHandover} />
                </>
              ) : (
                <>
                  <MultiStudentBanner groups={groups} orders={results} />

                  {groups.map((group) => (
                    <section
                      key={group.key}
                      aria-label={`Orders for ${group.name}`}
                      className="space-y-4"
                    >
                      <StudentGroupHeader group={group} />
                      <OrderList orders={group.orders} onRequestHandover={requestHandover} />
                    </section>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </section>
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
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                key="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="handover-title"
                aria-describedby="handover-desc"
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.94 }}
                transition={{
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
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
   STATES
===================================================== */

function InitialState() {
  const steps = [
    {
      icon: Hash,
      title: "Ask for the matric",
      text: "Type the full matric number or just its last 4 characters.",
    },
    {
      icon: Receipt,
      title: "Or use the reference",
      text: "Paste the order reference from the student's receipt.",
    },
    {
      icon: ShieldCheck,
      title: "Verify, then hand over",
      text: "Match the photo and name before marking the order collected.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-6 md:p-8"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-brand-accent/10 text-brand-accent">
          <ScanSearch className="size-8" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-white">Look up a student's order</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Results show the student's profile picture so you can confirm who is collecting.
        </p>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {steps.map((step, idx) => (
          <li key={step.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-white/5 text-xs font-bold text-slate-300">
                {idx + 1}
              </span>
              <step.icon className="size-4 text-brand-accent" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{step.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{step.text}</p>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

function LoadingState({ term }: { term: string }) {
  return (
    <div role="status" aria-label={`Searching orders for ${term}`} className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
        <div className="flex animate-pulse flex-col gap-5 sm:flex-row sm:items-center">
          <div className="size-16 shrink-0 rounded-3xl bg-white/5 md:size-20" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-5 w-48 rounded bg-white/10" />
            <div className="h-3 w-64 max-w-full rounded bg-white/5" />
          </div>
        </div>
      </div>

      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-3xl border border-white/10 bg-slate-900/50"
        />
      ))}

      <span className="sr-only">Searching orders for {term}…</span>
    </div>
  );
}

function EmptyState({ term, onClear }: { term: string; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-slate-900/50 p-8"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid size-16 place-items-center rounded-3xl bg-slate-500/10">
          <SearchX className="size-8 text-slate-400" aria-hidden="true" />
        </div>

        <h2 className="text-lg font-bold text-white">
          No orders found for <span className="break-all text-brand-accent">“{term}”</span>
        </h2>

        <p className="mt-2 max-w-md text-sm text-slate-500">
          No paid order matches this search. Check the matric number or reference with the student
          and try again.
        </p>

        <button
          type="button"
          onClick={onClear}
          className={`mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white ${focusRing}`}
        >
          Search Again
        </button>
      </div>
    </motion.div>
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
  const totalUnits = unitsOf(order);

  return (
    <div>
      {/* CLOSE BUTTON */}
      <button
        type="button"
        onClick={onCancel}
        disabled={updating}
        className={`absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50 ${focusRing}`}
        aria-label="Close"
      >
        <X className="size-4" aria-hidden="true" />
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
            <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
          </motion.div>
        </div>

        {/* TITLE */}
        <h2 id="handover-title" className="text-center text-xl font-bold text-white">
          Confirm hand over
        </h2>

        <p id="handover-desc" className="mt-2 text-center text-sm text-slate-400">
          Please verify the student details below before handing over the components. This action
          will mark the order as <span className="font-semibold text-white">Collected</span> and
          cannot be undone.
        </p>

        {/* STUDENT CONFIRMATION CARD */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex items-center gap-4">
            <StudentAvatar
              name={order.userName}
              imageUrl={order.userImage}
              className="grid size-16 shrink-0 place-items-center rounded-3xl bg-brand-accent/10 ring-2 ring-white/10"
              textClassName="text-lg font-bold text-brand-accent"
            />

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
            <Info label="Reference" value={order.reference} mono />
            <Info label="Total paid" value={formatNaira(order.total)} />
            <Info label="Items" value={`${totalUnits} ${totalUnits === 1 ? "unit" : "units"}`} />
            <Info label="Paid on" value={formatDateTime(order.paidAt)} />
          </div>
        </div>

        {/* WARNING */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs text-amber-200/90">
            Only click "Confirm" if you are physically handing over the components to this student
            right now.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={updating}
            aria-busy={updating}
            className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-green-500 font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          >
            {updating ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Marking...
              </>
            ) : (
              <>
                <Check className="size-4" aria-hidden="true" />
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
   STUDENT PROFILE (single student)
===================================================== */

function StudentProfileCard({ group }: { group: StudentGroup }) {
  const stats = summarize(group.orders);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-accent/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <StudentAvatar
            name={group.name}
            imageUrl={group.image}
            className="grid size-20 shrink-0 place-items-center rounded-3xl bg-brand-accent/10 ring-2 ring-brand-accent/30 ring-offset-2 ring-offset-slate-900"
            textClassName="text-2xl font-bold text-brand-accent"
          />

          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-green-400">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Student found
            </p>

            <h2 className="mt-1 break-words text-2xl font-bold text-white">{group.name}</h2>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {group.matric && <MatricBadge matric={group.matric} />}
              {group.email && <EmailLink email={group.email} />}
            </div>

            <StatusChips pending={stats.pendingCount} collected={stats.collectedCount} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:w-auto lg:min-w-[340px]">
          <StatPill label="Orders" value={String(stats.orderCount)} />
          <StatPill label="Items" value={String(stats.units)} />
          <StatPill label="Pending" value={formatNaira(stats.pendingValue)} highlight />
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MULTI-STUDENT BANNER + GROUP HEADER
===================================================== */

function MultiStudentBanner({ groups, orders }: { groups: StudentGroup[]; orders: PickupOrder[] }) {
  const stats = summarize(orders);
  const preview = groups.slice(0, 4);

  return (
    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xl md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 -space-x-3">
            {preview.map((g) => (
              <StudentAvatar
                key={g.key}
                name={g.name}
                imageUrl={g.image}
                className="grid size-12 place-items-center rounded-2xl bg-slate-800 ring-2 ring-slate-950"
                textClassName="text-xs font-bold text-brand-accent"
              />
            ))}
            {groups.length > preview.length && (
              <div className="grid size-12 place-items-center rounded-2xl bg-slate-800 text-xs font-bold text-slate-300 ring-2 ring-slate-950">
                +{groups.length - preview.length}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
              <Users className="size-3.5" aria-hidden="true" />
              {groups.length} students matched
            </p>
            <p className="mt-1 text-sm text-amber-100/80">
              Multiple students match this search — check the photo and matric of each student below
              before handing over.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:min-w-[340px]">
          <StatPill label="Orders" value={String(stats.orderCount)} />
          <StatPill label="Items" value={String(stats.units)} />
          <StatPill label="Pending" value={formatNaira(stats.pendingValue)} highlight />
        </div>
      </div>
    </div>
  );
}

function StudentGroupHeader({ group }: { group: StudentGroup }) {
  const stats = summarize(group.orders);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
      <div className="flex min-w-0 items-center gap-4">
        <StudentAvatar
          name={group.name}
          imageUrl={group.image}
          className="grid size-16 shrink-0 place-items-center rounded-3xl bg-brand-accent/10 ring-2 ring-white/10"
          textClassName="text-lg font-bold text-brand-accent"
        />

        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-white">{group.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {group.matric && <MatricBadge matric={group.matric} />}
            {group.email && <EmailLink email={group.email} />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-slate-300">
          {stats.orderCount} order{stats.orderCount === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-brand-accent/20 bg-brand-accent/10 px-3 py-1 text-xs font-bold text-brand-accent">
          {formatNaira(stats.pendingValue)} pending
        </span>
      </div>
    </div>
  );
}

/* =====================================================
   SMALL PIECES
===================================================== */

function MatricBadge({ matric }: { matric: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-brand-accent/20 bg-brand-accent/10 px-2 py-1 font-mono font-semibold text-brand-accent">
      <Hash className="size-3" aria-hidden="true" />
      <span className="sr-only">Matric number </span>
      {matric}
    </span>
  );
}

function EmailLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className={`inline-flex min-w-0 items-center gap-1 rounded-lg px-1 py-1 text-slate-400 transition hover:text-white ${focusRing}`}
    >
      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{email}</span>
    </a>
  );
}

function StatusChips({ pending, collected }: { pending: number; collected: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {pending > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
          <Clock className="size-3" aria-hidden="true" />
          {pending} awaiting pickup
        </span>
      )}
      {collected > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-400">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          {collected} collected
        </span>
      )}
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
      className={`min-w-0 rounded-2xl border px-3 py-2.5 text-center ${
        highlight ? "border-brand-accent/20 bg-brand-accent/10" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>

      <p
        className={`mt-1 truncate text-sm font-bold ${highlight ? "text-brand-accent" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

/* =====================================================
   ORDER LIST + CARD
===================================================== */

function OrderList({
  orders,
  onRequestHandover,
}: {
  orders: PickupOrder[];
  onRequestHandover: (order: PickupOrder) => void;
}) {
  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.id}>
          <PickupOrderCard order={order} onRequestHandover={onRequestHandover} />
        </li>
      ))}
    </ul>
  );
}

function PickupOrderCard({
  order,
  onRequestHandover,
}: {
  order: PickupOrder;
  onRequestHandover: (order: PickupOrder) => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
    } catch {
      // Clipboard unavailable (insecure context / denied) — nothing to do.
    }
  };

  const isCollected = isCollectedOrder(order);
  const units = unitsOf(order);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Order ${order.reference}`}
      className={`overflow-hidden rounded-3xl border shadow-xl transition-colors ${
        isCollected ? "border-white/5 bg-slate-900/40" : "border-white/10 bg-slate-900/70"
      }`}
    >
      {/* HEADER */}
      <div
        className={`border-b p-5 md:p-6 ${
          isCollected ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Package
                className={`h-4 w-4 shrink-0 ${isCollected ? "text-slate-600" : "text-brand-accent"}`}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Order Reference
              </span>
            </div>

            <div className="mt-1.5 flex min-w-0 items-center gap-2">
              <span
                className={`truncate font-mono text-sm font-semibold ${
                  isCollected ? "text-slate-400" : "text-white"
                }`}
              >
                {order.reference}
              </span>
              <button
                type="button"
                onClick={copyRef}
                aria-label={copied ? "Reference copied" : `Copy reference ${order.reference}`}
                title={copied ? "Copied" : "Copy reference"}
                className={`grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white ${focusRing}`}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Paid on </span>
                {formatDateTime(order.paidAt)}
              </span>

              {order.channel && (
                <span className="inline-flex items-center gap-1 capitalize">
                  {order.channel === "card" ? (
                    <CreditCard className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                  )}
                  {order.channel.replace("_", " ")}
                </span>
              )}
            </div>
          </div>

          <OrderStatus status={order.status} />
        </div>
      </div>

      {/* STUDENT ROW */}
      <div
        className={`flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between md:px-6 ${
          isCollected ? "border-white/5" : "border-white/10"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <StudentAvatar
            name={order.userName}
            imageUrl={order.userImage}
            className={`grid size-10 shrink-0 place-items-center rounded-xl bg-brand-accent/10 ${
              isCollected ? "opacity-60 grayscale" : ""
            }`}
            textClassName="text-xs font-bold text-brand-accent"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Student
            </p>
            <p className="truncate text-sm font-semibold text-white">{order.userName || "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-8">
          <Info label="Matric Number" value={order.matric || "—"} mono />
          <Info label="Order Total" value={formatNaira(order.total)} />
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h4 className="font-bold text-white">Ordered Products</h4>
          <p className="text-xs text-slate-500">
            {order.items.length} product{order.items.length !== 1 && "s"} · {units} unit
            {units !== 1 && "s"}
          </p>
        </div>

        <ul className="space-y-3">
          {order.items.map((item, idx) => (
            <li
              key={`${order.id}-${idx}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/70 p-3 sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:size-14">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className={`h-full w-full object-cover ${isCollected ? "grayscale" : ""}`}
                    />
                  ) : (
                    <Package className="h-6 w-6 text-slate-700" aria-hidden="true" />
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
                        <span className="text-slate-700" aria-hidden="true">
                          •
                        </span>
                      </>
                    )}
                    <span>
                      {item.quantity} × {formatNaira(item.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    isCollected
                      ? "bg-slate-800 text-slate-400"
                      : "bg-brand-accent/10 text-brand-accent"
                  }`}
                >
                  × {item.quantity}
                </span>
                <span className="text-sm font-semibold text-white">
                  {formatNaira(item.price * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* FOOTER */}
      <div
        className={`flex flex-col gap-4 border-t p-5 sm:flex-row sm:items-center sm:justify-between md:p-6 ${
          isCollected ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Total paid
          </p>
          <p className="mt-0.5 text-xl font-bold text-white">{formatNaira(order.total)}</p>
        </div>

        {isCollected ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-400">
            <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
            Already handed over
            {order.collectedAt ? ` · ${formatDateTime(order.collectedAt)}` : ""}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onRequestHandover(order)}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 font-bold text-white transition hover:bg-green-600 active:scale-[0.99] sm:w-auto ${focusRing}`}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Hand Over to Student
          </button>
        )}
      </div>
    </motion.article>
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
      className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider ${styles}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${isCollected ? "bg-slate-400" : "bg-green-400"}`}
      />
      <span className="sr-only">Pickup status: </span>
      {label}
    </span>
  );
}

/* =====================================================
   INFO
===================================================== */

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>

      <p className={`mt-1 truncate text-sm font-semibold text-white ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
