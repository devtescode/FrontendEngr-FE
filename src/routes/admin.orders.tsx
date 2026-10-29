import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Boxes,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Hash,
  Loader2,
  Mail,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Pagination } from "@/components/Pagination";
import { StudentAvatar } from "@/components/StudentAvatar";
import { useAdminCarts, type AdminCart } from "@/hooks/useAdminQueries";
import { useClientPagination } from "@/hooks/useClientPagination";
import { toErrorMessage } from "@/lib/queryClient";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [{ title: "User Carts — Admin" }],
  }),
  component: AdminCarts,
});

// =====================================================
// CONSTANTS
// =====================================================

const CARTS_PAGE_SIZE = 4;
const PREVIEW_THUMBS = 4;
const DELETED_ACCOUNT = "Deleted account";

type CartItem = AdminCart["items"][number];

// =====================================================
// HELPERS
// =====================================================

const formatNaira = (amount: number) =>
  `₦${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatCount = (value: number) => (Number.isFinite(value) ? value : 0).toLocaleString("en-NG");

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

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const formatRelative = (d: Date) => {
  const diffSeconds = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 45) return "just now";
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86400), "day");
  if (abs < 86400 * 365)
    return relativeFormatter.format(Math.round(diffSeconds / (86400 * 30)), "month");
  return relativeFormatter.format(Math.round(diffSeconds / (86400 * 365)), "year");
};

const unitPrice = (item: CartItem) => Number(item.componentId?.price) || 0;

const getCartTotal = (cart: AdminCart) =>
  cart.items.reduce((total, item) => total + unitPrice(item) * item.quantity, 0);

const getCartUnits = (cart: AdminCart) => cart.items.reduce((sum, item) => sum + item.quantity, 0);

const displayName = (cart: AdminCart) => cart.userId?.fullName || DELETED_ACCOUNT;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60";

// =====================================================
// PAGE
// =====================================================

function AdminCarts() {
  const searchId = useId();

  const {
    carts,
    isLoading: loading,
    isFetching,
    isError,
    error: queryError,
    refetch,
  } = useAdminCarts();

  const error = isError ? toErrorMessage(queryError, "Failed to load carts") : "";

  const [search, setSearch] = useState("");
  const [selectedCarts, setSelectedCarts] = useState<string[]>([]);

  /*
   * CART CURRENTLY BEING VIEWED
   */
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);

  /*
   * Derive the viewed cart from the latest data so the modal
   * never shows a stale snapshot after a refetch.
   */
  const selectedCart = useMemo(
    () => (selectedCartId ? (carts.find((cart) => cart._id === selectedCartId) ?? null) : null),
    [carts, selectedCartId],
  );

  useEffect(() => {
    // Close the modal if the cart disappeared after a refetch.
    if (selectedCartId && !selectedCart) {
      setSelectedCartId(null);
    }
  }, [selectedCartId, selectedCart]);

  useEffect(() => {
    // Drop selections for carts that no longer exist.
    setSelectedCarts((current) => {
      const ids = new Set(carts.map((cart) => cart._id));
      const next = current.filter((id) => ids.has(id));
      return next.length === current.length ? current : next;
    });
  }, [carts]);

  /*
   * SEARCH
   */
  const trimmedSearch = search.trim();
  const searching = trimmedSearch.length > 0;

  const filteredCarts = useMemo(() => {
    const value = trimmedSearch.toLowerCase();
    if (!value) return carts;

    return carts.filter((cart) => {
      const user = cart.userId;
      return (
        user?.fullName?.toLowerCase().includes(value) ||
        user?.matric?.toLowerCase().includes(value) ||
        user?.email?.toLowerCase().includes(value)
      );
    });
  }, [carts, trimmedSearch]);

  /*
   * PAGINATION (client-side; search resets to page 1)
   */
  const {
    page,
    setPage,
    totalPages,
    totalItems: totalCarts,
    pageItems: pageCarts,
    rangeStart,
    rangeEnd,
  } = useClientPagination(filteredCarts, CARTS_PAGE_SIZE, search);

  const listTopRef = useRef<HTMLDivElement>(null);

  const handlePageChange = useCallback(
    (next: number) => {
      setPage(next);
      // Instant: a smooth scroll racing the page swap made the scrollbar jump.
      listTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    },
    [setPage],
  );

  /*
   * SUMMARY (over the full filtered set, not just the current page)
   */
  const { totalUnits, totalCartValue } = useMemo(
    () =>
      filteredCarts.reduce(
        (acc, cart) => ({
          totalUnits: acc.totalUnits + getCartUnits(cart),
          totalCartValue: acc.totalCartValue + getCartTotal(cart),
        }),
        { totalUnits: 0, totalCartValue: 0 },
      ),
    [filteredCarts],
  );

  /*
   * SELECTION
   */
  const toggleCart = (cartId: string) => {
    setSelectedCarts((current) =>
      current.includes(cartId) ? current.filter((id) => id !== cartId) : [...current, cartId],
    );
  };

  const selectAll = () => {
    setSelectedCarts(filteredCarts.map((cart) => cart._id));
  };

  const clearSelection = () => {
    setSelectedCarts([]);
  };

  const allSelected =
    filteredCarts.length > 0 && filteredCarts.every((cart) => selectedCarts.includes(cart._id));

  const showInitialError = !!error && !loading && carts.length === 0;
  const isUpdating = !loading && isFetching;

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-accent">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Cart Monitoring
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">User Carts</h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor the components students currently have in their carts before they place an
              order. Search by student name, matric number, or email.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
            aria-label="Refresh user carts"
            className={`inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto ${FOCUS_RING}`}
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
          aria-label="Cart statistics"
          className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
        >
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Students"
            value={formatCount(filteredCarts.length)}
            accent="blue"
            loading={loading}
          />
          <StatCard
            icon={<Boxes className="h-5 w-5" />}
            label="Total Units"
            value={formatCount(totalUnits)}
            accent="purple"
            loading={loading}
          />
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            label="Cart Value"
            value={formatNaira(totalCartValue)}
            accent="gold"
            loading={loading}
            className="col-span-2 lg:col-span-1"
          />
        </section>

        {/* TOOLBAR */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search user carts
            </label>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              autoComplete="off"
              placeholder="Search by name, matric number or email..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? clearSelection : selectAll}
              disabled={loading || filteredCarts.length === 0}
              className={`inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              <CheckSquare className="h-4 w-4" aria-hidden="true" />
              {allSelected ? "Clear all" : `Select all (${totalCarts})`}
            </button>

            {selectedCarts.length > 0 && (
              <span
                role="status"
                className="inline-flex h-12 items-center rounded-2xl bg-brand-accent/10 px-4 text-sm font-semibold text-brand-accent ring-1 ring-brand-accent/20"
              >
                {selectedCarts.length} selected
              </span>
            )}
          </div>
        </div>

        {/* RESULT SUMMARY */}
        <div
          ref={listTopRef}
          className="mb-4 flex min-h-6 scroll-mt-6 flex-wrap items-center justify-between gap-2 text-sm"
        >
          <p className="text-slate-500" aria-live="polite" aria-atomic="true">
            {loading ? (
              "Loading carts…"
            ) : totalCarts === 0 ? (
              <>
                Showing <span className="font-semibold text-slate-200">0</span> active carts
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-200">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of <span className="font-semibold text-slate-200">{formatCount(totalCarts)}</span>{" "}
                active {totalCarts === 1 ? "cart" : "carts"}
                {searching && (
                  <>
                    {" "}
                    matching <span className="font-semibold text-slate-200">“{trimmedSearch}”</span>
                  </>
                )}
              </>
            )}
          </p>

          {isUpdating && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-accent" aria-hidden="true" />
              Updating…
            </span>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: CARTS_PAGE_SIZE }, (_, i) => (
              <CartSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ERROR (nothing loaded) */}
        {showInitialError && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center"
          >
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" aria-hidden="true" />
            <p className="font-semibold text-red-300">Couldn't load user carts</p>
            <p className="mt-1 text-sm text-red-400/80">{error}</p>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
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
        {!loading && !showInitialError && filteredCarts.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-12 text-center md:p-16">
            {searching ? (
              <>
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-slate-500/10">
                  <Search className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-white">No student found</h2>
                <p className="mx-auto mt-1 max-w-md break-words text-sm text-slate-500">
                  No active cart matches “{trimmedSearch}”. Try another name, matric number or
                  email.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-brand-accent/10">
                  <ShoppingCart className="h-8 w-8 text-brand-accent/60" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-white">No active carts</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Students who add components to their cart will appear here.
                </p>
              </>
            )}
          </div>
        )}

        {/* LIST */}
        {!loading && filteredCarts.length > 0 && (
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
                  onClick={() => {
                    void refetch();
                  }}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                >
                  Retry
                </button>
              </div>
            )}

            <ul aria-label="Active user carts" aria-busy={isUpdating} className="space-y-3">
              {pageCarts.map((cart, index) => (
                <CartCard
                  key={cart._id}
                  cart={cart}
                  index={index}
                  selected={selectedCarts.includes(cart._id)}
                  onToggle={() => toggleCart(cart._id)}
                  onView={() => setSelectedCartId(cart._id)}
                />
              ))}
            </ul>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalCarts}
              pageSize={CARTS_PAGE_SIZE}
              onPageChange={handlePageChange}
              itemLabel="carts"
              ariaLabel="User carts pagination"
              showSummary={false}
              variant="dark"
            />
          </>
        )}
      </div>

      {/* DETAILS MODAL */}
      {selectedCart && <CartDetails cart={selectedCart} onClose={() => setSelectedCartId(null)} />}
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

const STAT_ACCENTS = {
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
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: keyof typeof STAT_ACCENTS;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-3xl border p-4 sm:p-5 ${STAT_ACCENTS[accent]} ${className}`}>
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
        <div className="mt-4 truncate text-xl font-bold text-white sm:text-2xl">{value}</div>
      )}
    </div>
  );
}

/* =====================================================
   CART CARD
===================================================== */

function CartCard({
  cart,
  index,
  selected,
  onToggle,
  onView,
}: {
  cart: AdminCart;
  index: number;
  selected: boolean;
  onToggle: () => void;
  onView: () => void;
}) {
  const itemsId = useId();
  const [expanded, setExpanded] = useState(false);

  const user = cart.userId;
  const name = displayName(cart);
  const total = getCartTotal(cart);
  const units = getCartUnits(cart);
  const updatedAt = parseDate(cart.updatedAt);
  const previewItems = cart.items.slice(0, PREVIEW_THUMBS);
  const hiddenCount = cart.items.length - previewItems.length;

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={`overflow-hidden rounded-3xl border bg-slate-900/70 shadow-xl transition-colors ${
        selected
          ? "border-brand-accent/50 ring-1 ring-brand-accent/20"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="p-5 md:p-6">
        {/* TOP: selection + student + updated */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select cart for ${name}`}
              onClick={onToggle}
              className={`grid size-6 shrink-0 place-items-center rounded-md border transition ${FOCUS_RING} ${
                selected
                  ? "border-brand-accent bg-brand-accent text-white"
                  : "border-white/20 bg-white/5 text-transparent hover:border-white/40"
              }`}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>

            <StudentAvatar
              name={user?.fullName ?? ""}
              imageUrl={user?.profileImageUrl}
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 md:size-14"
              textClassName="text-sm font-bold text-brand-accent"
            />

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-white">{name}</h2>
                {user?.matric && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-accent ring-1 ring-brand-accent/20">
                    <Hash className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">Matric number </span>
                    {user.matric}
                  </span>
                )}
              </div>
              {user?.email && (
                <span className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Email </span>
                  <a
                    href={`mailto:${user.email}`}
                    className={`truncate rounded hover:text-slate-300 ${FOCUS_RING}`}
                  >
                    {user.email}
                  </a>
                </span>
              )}
            </div>
          </div>

          {updatedAt && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <time dateTime={updatedAt.toISOString()} title={formatDateTime(updatedAt)}>
                updated{" "}
                <span className="font-medium text-slate-300">{formatRelative(updatedAt)}</span>
              </time>
            </span>
          )}
        </div>

        {/* ITEMS PREVIEW + PILLS + ACTIONS */}
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 -space-x-2" aria-hidden="true">
              {previewItems.map((item, idx) => (
                <ItemThumb
                  key={`${cart._id}-thumb-${idx}`}
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

            <p className="min-w-0 truncate text-xs text-slate-500">
              {cart.items.map((i) => i.componentId?.name).join(", ") || "No items"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-400">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-bold text-white">{formatCount(units)}</span>
              {units === 1 ? "unit" : "units"}
            </span>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-brand-accent/20 bg-brand-accent/5 px-3 text-xs text-slate-400">
              Total
              <span className="font-bold text-brand-accent">{formatNaira(total)}</span>
            </span>

            {cart.items.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={itemsId}
                aria-label={`${expanded ? "Hide" : "Show"} items in ${name}'s cart`}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/5 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                {expanded ? "Hide items" : "Items"}
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            )}

            <button
              type="button"
              onClick={onView}
              aria-label={`View cart for ${name}`}
              className={`group inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-accent px-4 text-sm font-semibold text-white transition hover:bg-brand-accent/90 hover:shadow-lg hover:shadow-brand-accent/10 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${FOCUS_RING}`}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              View cart
              <ChevronRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED ITEM TABLE (no exit animation on purpose) */}
      {expanded && (
        <div id={itemsId} className="border-t border-white/10 bg-white/[0.02]">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_90px_130px] gap-4 border-b border-white/5 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:grid">
            <span>Component</span>
            <span>Unit price</span>
            <span>Quantity</span>
            <span className="text-right">Subtotal</span>
          </div>

          <ul className="divide-y divide-white/5">
            {cart.items.map((item, idx) => {
              const component = item.componentId;
              const price = unitPrice(item);

              return (
                <li
                  key={component?._id || idx}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_120px_90px_130px] md:items-center md:gap-4 md:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ItemThumb item={item} className="size-11" withAlt />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{component?.name}</p>
                      {component?.sku && (
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {component.sku}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-sm md:block">
                    <span className="text-xs text-slate-600 md:hidden">Unit price</span>
                    <span className="text-slate-300">{formatNaira(price)}</span>
                  </div>

                  <div className="flex justify-between md:block">
                    <span className="text-xs text-slate-600 md:hidden">Quantity</span>
                    <span className="inline-flex rounded-lg bg-white/5 px-2.5 py-1 text-sm font-bold text-white">
                      × {item.quantity}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm md:block md:text-right">
                    <span className="text-xs text-slate-600 md:hidden">Subtotal</span>
                    <span className="font-bold text-slate-200">
                      {formatNaira(price * item.quantity)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-white/5 px-5 py-4 text-sm md:px-6">
            <span className="text-slate-500">Cart total</span>
            <span className="font-bold text-white">{formatNaira(total)}</span>
          </div>
        </div>
      )}
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
  item: CartItem;
  className?: string;
  withAlt?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const image = item.componentId?.image;

  useEffect(() => {
    setFailed(false);
  }, [image]);

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-slate-800 ${className}`}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={withAlt ? item.componentId?.name || "Component" : ""}
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
   CART DETAILS MODAL
===================================================== */

function CartDetails({ cart, onClose }: { cart: AdminCart; onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Keep the latest onClose without re-running the mount effect.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;

    // Lock body scroll and compensate for the vanished scrollbar.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      // Keep Tab focus inside the dialog.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.();
    };
  }, []);

  const user = cart.userId;
  const name = displayName(cart);
  const totalUnits = getCartUnits(cart);
  const total = getCartTotal(cart);
  const updatedAt = parseDate(cart.updatedAt);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* BACKDROP */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      {/* PANEL */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl sm:rounded-3xl"
      >
        {/* HEADER */}
        <div className="border-b border-white/10 bg-slate-900/90 px-5 py-5 md:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <StudentAvatar
                name={user?.fullName ?? ""}
                imageUrl={user?.profileImageUrl}
                className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-accent/10"
                textClassName="text-lg font-bold text-brand-accent"
              />

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-accent">
                  Cart details
                </p>
                <h2 id={titleId} className="mt-1 truncate text-xl font-bold text-white">
                  {name}
                </h2>
                {updatedAt && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <time dateTime={updatedAt.toISOString()} title={formatDateTime(updatedAt)}>
                      updated {formatRelative(updatedAt)} — {formatDateTime(updatedAt)}
                    </time>
                  </p>
                )}
              </div>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close cart details"
              className={`grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {user && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                <Hash className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Matric number
                  </p>
                  <p className="truncate font-mono text-sm font-semibold text-white">
                    {user.matric || "—"}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                <Mail className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Email</p>
                  {user.email ? (
                    <a
                      href={`mailto:${user.email}`}
                      className={`block truncate rounded text-sm font-semibold text-white hover:text-brand-accent ${FOCUS_RING}`}
                    >
                      {user.email}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-white">—</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="cart-details-scroll flex-1 overflow-y-auto overscroll-contain px-5 py-5 md:px-7">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Components in cart</h3>
            <p id={descriptionId} className="mt-1 text-xs text-slate-500">
              {cart.items.length} {cart.items.length === 1 ? "component" : "components"} •{" "}
              {formatCount(totalUnits)} {totalUnits === 1 ? "unit" : "units"}
            </p>
          </div>

          {cart.items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-500">
              This cart is empty.
            </div>
          ) : (
            <ul className="space-y-2">
              {cart.items.map((item, idx) => {
                const component = item.componentId;
                const price = unitPrice(item);

                return (
                  <li
                    key={component?._id || idx}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/70 p-3 sm:gap-4"
                  >
                    <ItemThumb item={item} className="size-14 sm:size-16" withAlt />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{component?.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {component?.sku && (
                          <>
                            <span className="font-mono">{component.sku}</span>
                            <span className="text-slate-700"> • </span>
                          </>
                        )}
                        {item.quantity} × {formatNaira(price)}
                      </p>
                      {component?.category && (
                        <span className="mt-1.5 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          {component.category}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 text-right text-sm font-bold text-slate-200">
                      {formatNaira(price * item.quantity)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-slate-900/95 px-5 py-5 md:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Total units
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{formatCount(totalUnits)}</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Cart total
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-accent">{formatNaira(total)}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* =====================================================
   SKELETON
===================================================== */

function CartSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
      <div className="flex items-center gap-4">
        <div className="size-6 shrink-0 animate-pulse rounded-md bg-white/5" />
        <div className="size-12 shrink-0 animate-pulse rounded-2xl bg-white/5 md:size-14" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
        </div>
        <div className="hidden h-4 w-28 animate-pulse rounded bg-white/5 sm:block" />
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-10 animate-pulse rounded-xl bg-white/5 ring-2 ring-slate-900"
            />
          ))}
        </div>
        <div className="h-10 w-40 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  );
}
