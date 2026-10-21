import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Boxes,
  ChevronDown,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  ComponentCard,
  ensureCartLoaded,
} from "@/components/ComponentCard";
import { ComponentGridSkeleton } from "@/components/ComponentGridSkeleton";
import { Pagination } from "@/components/Pagination";
import { RequireAuth } from "@/components/RequireAuth";

import { usePaginatedComponents } from "@/hooks/usePaginatedComponents";
import type { Category } from "@/lib/data";
import { socket } from "@/lib/socket";

export const Route = createFileRoute("/components")({
  head: () => ({
    meta: [
      {
        title: "Components — PulseLab",
      },
    ],
  }),

  component: () => (
    <RequireAuth role="student">
      <ComponentsLayout />
    </RequireAuth>
  ),
});

function ComponentsLayout() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (pathname !== "/components") {
    return <Outlet />;
  }

  return <CatalogIndex />;
}

const CATEGORIES: (Category | "All")[] = [
  "All",
  "Microcontroller",
  "Sensors",
  "Prototyping",
  "Passive",
  "Power",
  "Connector",
];

const SORTS = [
  {
    id: "recent",
    label: "Recently updated",
    sort: "updatedAt",
    order: "desc",
  },
  {
    id: "popular",
    label: "Most stocked",
    sort: "stock",
    order: "desc",
  },
  {
    id: "price-asc",
    label: "Price: low to high",
    sort: "price",
    order: "asc",
  },
  {
    id: "price-desc",
    label: "Price: high to low",
    sort: "price",
    order: "desc",
  },
] as const;

type SortId = (typeof SORTS)[number]["id"];

function CatalogIndex() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [sort, setSort] = useState<SortId>("recent");
  const [isLive, setIsLive] = useState(socket.connected);

  const activeSort = SORTS.find((option) => option.id === sort) ?? SORTS[0];

  const {
    components,
    pagination,
    page,
    setPage,
    loading,
    refreshing,
    error,
    refresh,
  } = usePaginatedComponents({
    pageSize: 6,
    sort: activeSort.sort,
    order: activeSort.order,
    search: q,
    category: cat,
  });

  // One shared cart request for every card on the page.
  useEffect(() => {
    void ensureCartLoaded();
  }, []);

  // Connection indicator only. Component data refreshes are owned by the
  // pagination hook so there is exactly one listener per event.
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => setIsLive(true);
    const handleDisconnect = () => setIsLive(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    setIsLive(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  const inStockOnPage = useMemo(
    () => components.filter((component) => component.stock > 0).length,
    [components],
  );

  const hasActiveFilters = q.trim().length > 0 || cat !== "All";
  const hasFilters = hasActiveFilters || sort !== "recent";
  const showInventoryEmpty =
    !loading && !error && pagination.totalItems === 0 && !hasActiveFilters;
  const showNoResults =
    !loading && !error && pagination.totalItems === 0 && hasActiveFilters;

  const handleSearchChange = (value: string) => {
    // The hook owns the page reset for searches: the term is debounced, so
    // resetting here would fire a request for the old term before the new one
    // arrives.
    setQ(value);
  };

  const handleCategoryChange = (value: (typeof CATEGORIES)[number]) => {
    setCat(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    if (!SORTS.some((option) => option.id === value)) return;

    setSort(value as SortId);
    setPage(1);
  };

  const resetFilters = () => {
    setQ("");
    setCat("All");
    setSort("recent");
    setPage(1);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-5"
        >
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
              PulseLab inventory
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
              Component Catalog
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Browse lab-verified parts, check live stock, and add what you
              need to your cart. Recently updated components appear first.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <span
              className={`size-1.5 rounded-full ${
                isLive
                  ? "animate-pulse bg-emerald-500 motion-reduce:animate-none"
                  : "bg-slate-300"
              }`}
            />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {isLive ? "Live stock" : "Offline"}
            </span>
            {isLive ? (
              <Wifi className="size-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="size-3.5 text-slate-400" />
            )}
          </div>
        </motion.div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-100">
          <SummaryStat
            icon={Boxes}
            label="Matching components"
            value={pagination.totalItems.toLocaleString("en-NG")}
          />
          <SummaryStat
            icon={PackageCheck}
            label="In stock on this page"
            value={inStockOnPage.toLocaleString("en-NG")}
          />
          <SummaryStat
            icon={PackageSearch}
            label="Current page"
            value={`${page} of ${Math.max(1, pagination.totalPages)}`}
          />
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">Search components</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by name, SKU, or description…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-accent/40 focus:bg-white focus:ring-2 focus:ring-brand-accent/30 sm:text-sm"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>

            <div className="relative sm:min-w-56">
              <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <label htmlFor="component-sort" className="sr-only">
                Sort components
              </label>
              <select
                id="component-sort"
                value={sort}
                onChange={(event) => handleSortChange(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 text-base text-slate-700 outline-none transition focus:border-brand-accent/40 focus:bg-white focus:ring-2 focus:ring-brand-accent/30 sm:text-sm"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            {CATEGORIES.map((category) => {
              const selected = cat === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  aria-pressed={selected}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 sm:text-sm ${
                    selected
                      ? "bg-brand-navy text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-brand-navy"
                  }`}
                >
                  {category}
                </button>
              );
            })}

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 sm:text-sm"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {error && components.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <p className="flex items-start gap-2 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Live refresh failed. Showing the last successfully loaded page.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <ComponentGridSkeleton />
        ) : error && components.length === 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-red-100 text-red-500">
              <AlertCircle className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-brand-navy">
              We couldn't load the catalog
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Check your connection and try again. Your cart and account are
              unaffected.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 text-sm font-semibold text-white transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" />
              Try again
            </button>
          </div>
        ) : showInventoryEmpty ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-14">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
              <PackageSearch className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-brand-navy">
              No components listed yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The lab inventory is empty right now. New parts will appear here
              as soon as they are added.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-brand-navy transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" />
              Refresh inventory
            </button>
          </div>
        ) : showNoResults ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-14">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Search className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-brand-navy">
              No components match your filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Try a different search term or category. Filters are applied
              across the entire inventory, not just this page.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 text-sm font-semibold text-white transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              <RotateCcw className="size-4" />
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div
              aria-busy={refreshing}
              className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
                refreshing ? "opacity-70" : "opacity-100"
              }`}
            >
              {components.map((component, index) => (
                <ComponentCard
                  key={component._id ?? component.id ?? index}
                  c={component}
                  index={index}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={setPage}
              disabled={loading}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-2 sm:px-5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-accent/10 text-brand-accent">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-brand-navy">
          {value}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}
