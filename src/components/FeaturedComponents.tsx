import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  FlaskConical,
  Package,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, type ElementType } from "react";

import { ComponentCard } from "@/components/ComponentCard";
import { ComponentGridSkeleton } from "@/components/ComponentGridSkeleton";
import { Pagination } from "@/components/Pagination";
import { Reveal } from "@/components/Section";
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

type CatalogStatus = "loading" | "live" | "stale" | "restocking" | "error";

const STATUS_CONFIG: Record<
  CatalogStatus,
  {
    label: string;
    chip: string;
    dot: string;
    ping: boolean;
  }
> = {
  loading: {
    label: "Checking stock",
    chip: "border-white/10 bg-white/5 text-slate-300",
    dot: "bg-slate-400",
    ping: false,
  },
  live: {
    label: "Live availability",
    chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
    ping: true,
  },
  stale: {
    label: "Showing last loaded stock",
    chip: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    ping: false,
  },
  restocking: {
    label: "Restocking",
    chip: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    ping: false,
  },
  error: {
    label: "Stock unavailable",
    chip: "border-red-400/20 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
    ping: false,
  },
};

const STATUS_COPY: Record<CatalogStatus, { headline: string; body: string }> = {
  loading: {
    headline: "Checking the lab shelf…",
    body: "Fetching the latest six components and stock counts from the lab.",
  },
  live: {
    headline: "Available for immediate laboratory collection.",
    body: "Newest uploads first. Pay online, then collect at the lab with your Order ID.",
  },
  stale: {
    headline: "Showing the last loaded lab stock.",
    body: "A live refresh failed. These cards are from the most recent successful request.",
  },
  restocking: {
    headline: "The shelf is being restocked.",
    body: "New components are on the way. Check back shortly.",
  },
  error: {
    headline: "We can't reach the lab stock right now.",
    body: "Check your connection and try again in a moment.",
  },
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
  const inStockCount = useMemo(
    () => components.filter((component) => component.stock > 0).length,
    [components],
  );

  const pageUnits = useMemo(
    () =>
      components.reduce(
        (total, component) => total + Math.max(0, component.stock),
        0,
      ),
    [components],
  );

  const isInitialLoading = loading && components.length === 0;

  const status: CatalogStatus = isInitialLoading
    ? "loading"
    : error
      ? components.length > 0
        ? "stale"
        : "error"
      : pagination.totalItems === 0
        ? "restocking"
        : "live";

  const statusConfig = STATUS_CONFIG[status];
  const statusCopy = STATUS_COPY[status];
  const showStats =
    status === "live" || status === "stale" || status === "restocking";

  return (
    <section
      id="featured"
      className="relative mx-auto max-w-7xl px-6 py-16 md:py-24"
    >
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-accent via-brand-gold to-emerald-500" />

          <div className="pointer-events-none absolute inset-0 bg-circuit opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

          <div className="absolute -left-20 bottom-0 size-64 rounded-full bg-brand-accent/10 blur-3xl" />

          <div className="relative grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-center xl:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/15 bg-brand-accent/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-700">
                  <Sparkles className="size-3.5 text-brand-accent" />
                  Newest arrivals
                </div>

                {pagination.totalItems > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <Package className="size-3 text-brand-accent" />
                    {pagination.totalItems.toLocaleString("en-NG")} components
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                Featured Components
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                The six most recent additions to the lab shelf, with stock
                counts synced from inventory. In-stock items are ready for
                campus pickup.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <FeaturePill icon={Zap} label="Same-day pickup" />
                <FeaturePill icon={PackageCheck} label="Lab-verified stock" />
                <FeaturePill icon={Boxes} label="Order ID collection" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-brand-navy p-5 text-white shadow-xl shadow-brand-navy/20 sm:p-6">
              <div className="absolute -right-12 -top-12 size-36 rounded-full bg-brand-gold/20 blur-3xl" />
              <div className="absolute -bottom-14 -left-10 size-36 rounded-full bg-brand-accent/20 blur-3xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-live="polite"
                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusConfig.chip}`}
                  >
                    <span className="relative flex size-2">
                      {statusConfig.ping && (
                        <span
                          className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${statusConfig.dot}`}
                        />
                      )}
                      <span
                        className={`relative inline-flex size-2 rounded-full ${statusConfig.dot}`}
                      />
                    </span>
                    {statusConfig.label}
                  </span>

                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing || loading}
                    className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Refresh live availability"
                    title="Refresh live availability"
                  >
                    <RefreshCw
                      className={`size-3.5 motion-reduce:animate-none ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <div className="hidden size-10 shrink-0 place-items-center rounded-xl bg-brand-gold/15 text-brand-gold sm:grid">
                    <FlaskConical className="size-5" />
                  </div>

                  <div>
                    <p className="text-base font-bold leading-6 sm:text-lg">
                      {statusCopy.headline}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm">
                      {statusCopy.body}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <AvailabilityStat
                    icon={Boxes}
                    label="In stock here"
                    value={
                      showStats ? inStockCount.toLocaleString("en-NG") : "—"
                    }
                  />
                  <AvailabilityStat
                    icon={PackageCheck}
                    label="Units here"
                    value={showStats ? pageUnits.toLocaleString("en-NG") : "—"}
                  />
                </div>

                <Link
                  to="/components"
                  className="group mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-navy transition-all hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy active:scale-[0.99]"
                >
                  Browse ready stock
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {isInitialLoading ? (
        <ComponentGridSkeleton className="mt-8" />
      ) : status === "error" ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-red-100 text-red-500">
            <AlertCircle className="size-5" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-brand-navy">
            We couldn't load the lab stock
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Check your connection and try again. Only six records are fetched
            at a time, so retrying is quick.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 text-sm font-semibold text-white transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
        </div>
      ) : components.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent">
            <Package className="size-5" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-brand-navy">
            The shelf is being restocked
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            New components are on their way to the lab. Refresh to check for
            new stock.
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
          {error && (
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm">
                Live refresh failed. Showing the last successfully loaded page.
              </p>
            </div>
          )}

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
            disabled={loading}
          />
        </>
      )}
    </section>
  );
}

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
      <Icon className="size-3.5 text-brand-accent" />
      {label}
    </span>
  );
}

function AvailabilityStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
      <p className="text-xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
        <Icon className="size-3 shrink-0 text-brand-gold" />
        {label}
      </p>
    </div>
  );
}
