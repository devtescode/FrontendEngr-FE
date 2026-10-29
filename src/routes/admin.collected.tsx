import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageCheck,
  Search,
  Loader2,
  AlertCircle,
  Package,
  Calendar,
  Copy,
  Check,
  Users,
  ChevronDown,
  XCircle,
  Filter,
  RefreshCw,
  Wallet,
  Boxes,
  Mail,
  Hash,
  CreditCard,
  Building2,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Pagination } from "@/components/Pagination";
import { StudentAvatar } from "@/components/StudentAvatar";
import {
  useAdminCollected,
  type CollectedSort,
} from "@/hooks/useAdminQueries";
import { toErrorMessage } from "@/lib/queryClient";
import type { NormalizedOrder } from "@/lib/normalize";

export const Route = createFileRoute("/admin/collected")({
  head: () => ({
    meta: [{ title: "Collected Orders — Admin" }],
  }),
  component: CollectedPage,
});

// =====================================================
// CONSTANTS
// =====================================================

const PAGE_SIZE = 4;
const SEARCH_DEBOUNCE_MS = 300;
const PREVIEW_THUMBS = 4;

const SORT_OPTIONS: { value: CollectedSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest value" },
];

// =====================================================
// HELPERS
// =====================================================

const formatNaira = (amount: number) =>
  `₦${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatCount = (value: number) =>
  (Number.isFinite(value) ? value : 0).toLocaleString("en-NG");

const parseDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (d: Date) =>
  d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const formatRelative = (d: Date) => {
  const diffSeconds = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 45) return "just now";
  if (abs < 3600)
    return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400)
    return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30)
    return relativeFormatter.format(Math.round(diffSeconds / 86400), "day");
  if (abs < 86400 * 365)
    return relativeFormatter.format(
      Math.round(diffSeconds / (86400 * 30)),
      "month"
    );
  return relativeFormatter.format(
    Math.round(diffSeconds / (86400 * 365)),
    "year"
  );
};

// =====================================================
// PAGE
// =====================================================

function CollectedPage() {
  const searchId = useId();
  const sortId = useId();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<CollectedSort>("recent");
  const [page, setPage] = useState(1);

  const listTopRef = useRef<HTMLDivElement>(null);

  const qRef = useRef(q);
  qRef.current = q;

  // Debounce the search box; a new query always starts on page 1.
  useEffect(() => {
    const next = searchInput.trim();
    const timer = window.setTimeout(() => {
      if (next === qRef.current) return;
      setQ(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const {
    orders,
    pagination,
    stats,
    isLoading,
    isFetching,
    isError,
    error: queryError,
    refetch,
    isPlaceholderData,
  } = useAdminCollected({ page, limit: PAGE_SIZE, q, sort });

  const totalItems = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const serverPage = pagination?.page ?? page;
  const pageSize = pagination?.limit ?? PAGE_SIZE;

  // The server clamps out-of-range pages; follow it so the controls agree.
  useEffect(() => {
    if (isPlaceholderData || !pagination) return;
    if (pagination.page !== page) setPage(Math.max(1, pagination.page));
  }, [isPlaceholderData, pagination, page]);

  const error = isError
    ? toErrorMessage(queryError, "Unable to load collected orders.")
    : null;

  const searching = q.length > 0;
  const isUpdating = !isLoading && (isFetching || isPlaceholderData);
  const showInitialError = !!error && !isLoading && orders.length === 0;

  const rangeStart = totalItems === 0 ? 0 : (serverPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(serverPage * pageSize, totalItems);

  const handleSortChange = (next: CollectedSort) => {
    setSort(next);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setQ("");
    setPage(1);
  };

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    // Instant: a smooth scroll racing the page swap made the scrollbar jump.
    listTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-400">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              Collected Orders
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Handover History
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Every order that has been handed over to a student. Search by
              student name, matric, email, order reference, or component.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh collected orders"
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </header>

        {/* STATS */}
        <section
          aria-label="Collected order statistics"
          className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          <StatCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="Orders collected"
            value={formatCount(stats?.orders ?? 0)}
            accent="green"
            loading={isLoading}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Students"
            value={formatCount(stats?.students ?? 0)}
            accent="blue"
            loading={isLoading}
          />
          <StatCard
            icon={<Boxes className="h-5 w-5" />}
            label="Items handed over"
            value={formatCount(stats?.items ?? 0)}
            accent="purple"
            loading={isLoading}
          />
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            label="Total value"
            value={formatNaira(stats?.value ?? 0)}
            accent="gold"
            loading={isLoading}
          />
        </section>

        {/* TOOLBAR */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search collected orders
            </label>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              maxLength={100}
              autoComplete="off"
              placeholder="Search by student, matric, email, reference, or component..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                aria-label="Clear search"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative md:w-56">
            <label htmlFor={sortId} className="sr-only">
              Sort collected orders
            </label>
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <select
              id={sortId}
              value={sort}
              onChange={(e) =>
                handleSortChange(e.target.value as CollectedSort)
              }
              className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/70 pl-10 pr-10 text-sm font-medium text-white outline-none transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* RESULT SUMMARY */}
        <div
          ref={listTopRef}
          className="mb-4 flex min-h-6 scroll-mt-6 flex-wrap items-center justify-between gap-2 text-sm"
        >
          <p className="text-slate-500" aria-live="polite" aria-atomic="true">
            {isLoading ? (
              "Loading collected orders…"
            ) : totalItems > 0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-200">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-200">
                  {formatCount(totalItems)}
                </span>{" "}
                {totalItems === 1 ? "order" : "orders"}
                {searching && (
                  <>
                    {" "}
                    matching{" "}
                    <span className="font-semibold text-slate-200">
                      “{q}”
                    </span>
                  </>
                )}
              </>
            ) : error ? (
              ""
            ) : (
              "No orders to show"
            )}
          </p>

          {isUpdating && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"
            >
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-brand-accent"
                aria-hidden="true"
              />
              Updating…
            </span>
          )}
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <CollectedSkeleton key={i} index={i} />
            ))}
          </div>
        )}

        {/* ERROR */}
        {showInitialError && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center"
          >
            <AlertCircle
              className="mx-auto mb-3 h-8 w-8 text-red-400"
              aria-hidden="true"
            />
            <p className="font-semibold text-red-300">
              Couldn't load collected orders
            </p>
            <p className="mt-1 text-sm text-red-400/80">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Retry
            </button>
          </div>
        )}

        {/* EMPTY */}
        {!isLoading && !error && totalItems === 0 && orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-12 text-center md:p-16">
            {searching ? (
              <>
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-500/10">
                  <Search
                    className="h-6 w-6 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  No matches found
                </h2>
                <p className="mx-auto mt-1 max-w-md break-words text-sm text-slate-500">
                  No collected order matches “{q}”. Try a different name,
                  matric number, reference, or component.
                </p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-green-500/10">
                  <PackageCheck
                    className="h-8 w-8 text-green-400/60"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-xl font-bold text-white">
                  No orders collected yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Once you hand over orders from the pickup page, they'll
                  appear here.
                </p>
              </>
            )}
          </div>
        )}

        {/* LIST */}
        {!isLoading && orders.length > 0 && (
          <>
            {error && (
              <div
                role="alert"
                className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {error}
                </span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                >
                  Retry
                </button>
              </div>
            )}

            <ul
              aria-label="Collected orders"
              aria-busy={isUpdating}
              className={`space-y-3 transition-opacity duration-200 ${
                isPlaceholderData ? "opacity-60" : "opacity-100"
              }`}
            >
              {orders.map((order, index) => (
                <CollectedCard key={order.id} order={order} index={index} />
              ))}
            </ul>

            <Pagination
              page={serverPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              disabled={isPlaceholderData}
              itemLabel="orders"
              ariaLabel="Collected orders pagination"
              showSummary={false}
              variant="dark"
            />
          </>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

const STAT_ACCENTS = {
  green: "border-green-500/20 bg-green-500/5 text-green-400",
  blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
  gold: "border-amber-500/20 bg-amber-500/5 text-amber-400",
} as const;

function StatCard({
  icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: keyof typeof STAT_ACCENTS;
  loading?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-3xl border p-4 sm:p-5 ${STAT_ACCENTS[accent]}`}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.04]"
          aria-hidden="true"
        >
          {icon}
        </div>
        <span className="truncate text-[10px] font-semibold uppercase tracking-widest opacity-80">
          {label}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 h-7 w-20 animate-pulse rounded-lg bg-white/5" />
      ) : (
        <div className="mt-4 truncate text-xl font-bold text-white sm:text-2xl">
          {value}
        </div>
      )}
    </div>
  );
}

/* =====================================================
   ORDER CARD
===================================================== */

function CollectedCard({
  order,
  index,
}: {
  order: NormalizedOrder;
  index: number;
}) {
  const itemsId = useId();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const totalUnits = order.items.reduce((a, i) => a + i.quantity, 0);
  const collectedAt = parseDate(order.collectedAt);
  const name = order.userName || "Unknown student";
  const previewItems = order.items.slice(0, PREVIEW_THUMBS);
  const hiddenCount = order.items.length - previewItems.length;

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions / insecure context) — ignore.
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl transition-colors hover:border-green-500/20"
    >
      <div className="p-5 md:p-6">
        {/* TOP: student + status */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <StudentAvatar
              name={order.userName}
              imageUrl={order.userImage}
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 md:size-14"
              textClassName="text-sm font-bold text-brand-accent"
            />

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-white">
                {name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {order.matric && (
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-brand-accent">
                    <Hash className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">Matric number </span>
                    {order.matric}
                  </span>
                )}
                {order.email && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="sr-only">Email </span>
                    <a
                      href={`mailto:${order.email}`}
                      className="truncate rounded hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                    >
                      {order.email}
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-green-400 ring-1 ring-green-500/20">
              <Check className="size-3" aria-hidden="true" />
              Collected
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {collectedAt ? (
                <time
                  dateTime={collectedAt.toISOString()}
                  title={formatDateTime(collectedAt)}
                >
                  <span className="font-medium text-slate-300">
                    {formatRelative(collectedAt)}
                  </span>
                  <span className="text-slate-600"> · </span>
                  {formatDateTime(collectedAt)}
                </time>
              ) : (
                "Date unavailable"
              )}
            </span>
          </div>
        </div>

        {/* REFERENCE */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/60 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Order reference
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-white">
              {order.reference}
            </p>
          </div>

          {order.channel && (
            <span className="hidden items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] capitalize text-slate-400 sm:inline-flex">
              {order.channel === "card" ? (
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {order.channel.replace(/_/g, " ")}
            </span>
          )}

          <button
            type="button"
            onClick={copyRef}
            aria-label={
              copied
                ? "Order reference copied"
                : `Copy order reference ${order.reference}`
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy
              </>
            )}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Order reference copied to clipboard" : ""}
          </span>
        </div>

        {/* ITEMS PREVIEW + TOTAL */}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 -space-x-2" aria-hidden="true">
              {previewItems.map((item, idx) => (
                <ItemThumb
                  key={`${order.id}-thumb-${idx}`}
                  item={item}
                  className="size-10 ring-2 ring-slate-900"
                />
              ))}
              {hiddenCount > 0 && (
                <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-slate-800 text-xs font-bold text-slate-300 ring-2 ring-slate-900">
                  +{hiddenCount}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {totalUnits} {totalUnits === 1 ? "unit" : "units"}
                <span className="font-normal text-slate-500">
                  {" "}
                  · {order.items.length}{" "}
                  {order.items.length === 1 ? "component" : "components"}
                </span>
              </p>
              <p className="truncate text-xs text-slate-500">
                {order.items.map((i) => i.name).join(", ") || "No items"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Total
              </p>
              <p className="mt-0.5 text-lg font-bold text-white">
                {formatNaira(order.total)}
              </p>
            </div>

            {order.items.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={itemsId}
                aria-label={`${expanded ? "Hide" : "Show"} items for order ${order.reference}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/5 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
              >
                {expanded ? "Hide items" : "View items"}
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${
                    expanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXPANDED ITEMS */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="items"
            id={itemsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="bg-white/[0.02] p-5 md:p-6">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                Components handed over ({order.items.length})
              </div>

              <ul className="space-y-2">
                {order.items.map((item, idx) => (
                  <li
                    key={`${order.id}-item-${idx}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/70 p-3"
                  >
                    <ItemThumb item={item} className="size-11" withAlt />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.sku && (
                          <>
                            <span className="font-mono">{item.sku}</span>
                            <span className="text-slate-700"> • </span>
                          </>
                        )}
                        {item.quantity} × {formatNaira(item.price)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right text-sm font-bold text-slate-200">
                      {formatNaira(item.price * item.quantity)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-sm">
                <span className="text-slate-500">Order total</span>
                <span className="font-bold text-white">
                  {formatNaira(order.total)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* =====================================================
   ITEM THUMBNAIL
===================================================== */

function ItemThumb({
  item,
  className = "",
  withAlt = false,
}: {
  item: NormalizedOrder["items"][number];
  className?: string;
  withAlt?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.image]);

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-slate-800 ${className}`}
    >
      {item.image && !failed ? (
        <img
          src={item.image}
          alt={withAlt ? item.name : ""}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package className="h-4 w-4 text-slate-600" aria-hidden="true" />
      )}
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
        <div className="size-12 shrink-0 animate-pulse rounded-2xl bg-white/5 md:size-14" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
        </div>
        <div className="hidden h-6 w-24 animate-pulse rounded-full bg-white/5 sm:block" />
      </div>
      <div className="mt-5 h-12 animate-pulse rounded-2xl bg-white/5" />
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-10 animate-pulse rounded-xl bg-white/5 ring-2 ring-slate-900"
            />
          ))}
        </div>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-white/5" />
      </div>
    </motion.div>
  );
}
