import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Package,
  PackageCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

import { ComponentCard } from "@/components/ComponentCard";
import { ComponentGridSkeleton } from "@/components/ComponentGridSkeleton";
import { Pagination } from "@/components/Pagination";
import { Reveal } from "@/components/Section";
import { useSocketConnected } from "@/hooks/useSocketConnected";
import type { BackendComponent, PaginationMeta } from "@/lib/api";

type FeaturedComponentsProps = {
  components: BackendComponent[];
  pagination: PaginationMeta;
  page: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
};

export function FeaturedComponents({
  components,
  pagination,
  page,
  loading,
  refreshing,
  error,
  onPageChange,
  onRefresh,
}: FeaturedComponentsProps) {
  const socketConnected = useSocketConnected();
  const inStockCount = useMemo(
    () => components.filter((component) => component.stock > 0).length,
    [components],
  );

  const pageUnits = useMemo(
    () => components.reduce((total, component) => total + Math.max(0, component.stock), 0),
    [components],
  );

  const isInitialLoading = loading && components.length === 0;
  const showEmpty = !isInitialLoading && !error && pagination.totalItems === 0;
  const showError = !isInitialLoading && Boolean(error) && components.length === 0;
  const statsUnavailable = Boolean(error) && components.length === 0;
  const isLive = socketConnected && !error;
  const statusLabel = error
    ? "Showing last loaded stock"
    : socketConnected
      ? "Live stock"
      : "Reconnecting";

  return (
    <section id="featured" className="relative bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
                <Sparkles className="size-3.5 text-brand-gold" />
                Newest arrivals
              </p>

              <h2 className="mt-3 font-display text-4xl tracking-[0.01em] text-brand-navy sm:text-5xl">
                Featured Components
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                The latest additions to the lab shelf, with stock counts synced from inventory.
                In-stock items are ready for campus pickup.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  isLive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
                role="status"
                aria-live="polite"
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isLive
                      ? "animate-pulse bg-emerald-500 motion-reduce:animate-none"
                      : "bg-amber-500"
                  }`}
                />
                {statusLabel}
              </span>

              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing || loading}
                aria-label="Refresh live availability"
                className="grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`size-3.5 ${
                    refreshing ? "animate-spin motion-reduce:animate-none" : ""
                  }`}
                />
              </button>

              <Link
                to="/components"
                className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-navy px-4 text-xs font-semibold text-white transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                View All
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-2 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-200">
            <InlineStat
              icon={Package}
              label="Components listed"
              value={
                loading && pagination.totalItems === 0
                  ? "…"
                  : statsUnavailable
                    ? "—"
                    : pagination.totalItems.toLocaleString("en-NG")
              }
            />
            <InlineStat
              icon={PackageCheck}
              label="In stock on this page"
              value={
                isInitialLoading
                  ? "…"
                  : statsUnavailable
                    ? "—"
                    : inStockCount.toLocaleString("en-NG")
              }
            />
            <InlineStat
              icon={Boxes}
              label="Units on this page"
              value={
                isInitialLoading ? "…" : statsUnavailable ? "—" : pageUnits.toLocaleString("en-NG")
              }
              className="col-span-2 sm:col-span-1"
            />
          </dl>
        </Reveal>

        {error && components.length > 0 && (
          <div
            role="status"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
          >
            <p className="flex items-start gap-2 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Live refresh failed. Showing the last successfully loaded page.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </button>
          </div>
        )}

        {isInitialLoading ? (
          <ComponentGridSkeleton className="mt-8" />
        ) : showError ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 text-center sm:p-12">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-red-100 text-red-500">
              <AlertCircle className="size-5" />
            </div>
            <h3 className="mt-4 font-display text-2xl text-brand-navy">
              We couldn't load the lab stock
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Check your connection and try again. Only six records are fetched at a time, so
              retrying is quick.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 text-sm font-semibold text-white transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" />
              Try again
            </button>
          </div>
        ) : showEmpty ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-14">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent">
              <Package className="size-5" />
            </div>
            <h3 className="mt-4 font-display text-2xl text-brand-navy">
              The shelf is being restocked
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New components are on their way to the lab. Refresh to check for new stock.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-brand-navy transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              <RefreshCw className="size-4" />
              Refresh stock
            </button>
          </div>
        ) : (
          <>
            <div
              aria-busy={refreshing}
              className={`mt-8 grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
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
              onPageChange={onPageChange}
              disabled={loading || refreshing}
            />
          </>
        )}
      </div>
    </section>
  );
}

function InlineStat({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 sm:px-5 ${className}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-accent shadow-sm ring-1 ring-slate-200">
        <Icon className="size-3.5" />
      </span>
      <div>
        <dd className="text-base font-bold leading-none text-brand-navy">{value}</dd>
        <dt className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </dt>
      </div>
    </div>
  );
}
