import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocketConnected } from "@/hooks/useSocketConnected";
import type { BackendComponent } from "@/lib/api";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ClipboardCheck,
    title: "Order placed",
    body: "Your order is created against your student account and order ID.",
  },
  {
    icon: ShieldCheck,
    title: "Payment verified",
    body: "The lab confirms your payment before any stock is reserved for pickup.",
  },
  {
    icon: PackageCheck,
    title: "Lab preparing",
    body: "Your components are picked, checked and set aside by the lab team.",
  },
  {
    icon: CheckCircle2,
    title: "Ready for pickup",
    body: "Collect your parts on campus with the order ID from your dashboard.",
  },
];

function formatRelativeTime(value?: string): string {
  if (!value) return "Recently";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";

  const diffMs = Date.now() - timestamp;
  if (diffMs <= 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function stockLabel(stock: number): string {
  if (stock <= 0) return "Out of stock";
  if (stock <= 5) return `Only ${stock} left`;
  return "In stock";
}

function stockTone(stock: number): string {
  if (stock <= 0) {
    return "bg-red-400/10 text-red-300 ring-red-400/30";
  }
  if (stock <= 5) {
    return "bg-amber-400/10 text-amber-300 ring-amber-400/30";
  }
  return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30";
}

function dotTone(stock: number): string {
  if (stock <= 0) return "bg-red-400";
  if (stock <= 5) return "bg-amber-400";
  return "bg-emerald-400";
}

function InventorySkeleton() {
  return (
    <ul className="mt-5 space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <li
          key={row}
          className="animate-pulse rounded-xl border border-white/5 bg-white/[0.03] p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-white/10" />
              <div className="h-2.5 w-1/3 rounded bg-white/5" />
            </div>
            <div className="h-5 w-20 rounded-full bg-white/10" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="h-2.5 w-14 rounded bg-white/5" />
            <div className="h-2.5 w-16 rounded bg-white/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LabLogistics({
  components,
  loading = false,
}: {
  components: BackendComponent[];
  loading?: boolean;
}) {
  const connected = useSocketConnected();
  const reduceMotion = useReducedMotion();

  const visibleComponents = components.slice(0, 5);

  return (
    <section
      id="logistics"
      className="relative overflow-hidden bg-brand-navy py-20 text-white md:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-circuit-dark opacity-40" />
      <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-brand-blue/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-brand-gold/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center lg:gap-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-brand-gold/5 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.18em] text-brand-gold">
            <Activity className="size-3.5" />
            REAL-TIME LAB LOGISTICS
          </div>

          <h2 className="mt-5 font-display text-5xl leading-[0.95] tracking-wide text-white md:text-6xl">
            From payment to pickup, tracked.
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            Every order moves through the same clear checkpoints, and the lab inventory panel
            reflects the records the system has actually loaded. No guesses, no inflated counters.
          </p>

          <ol className="relative mt-10 space-y-7 before:absolute before:top-4 before:bottom-4 before:left-[21px] before:w-px before:bg-gradient-to-b before:from-brand-gold/40 before:via-white/15 before:to-transparent">
            {STEPS.map((step) => (
              <li key={step.title} className="relative flex gap-4">
                <div className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-brand-gold ring-1 ring-white/5">
                  <step.icon className="size-5" />
                </div>
                <div className="pt-0.5">
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-400">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            delay: reduceMotion ? 0 : 0.12,
            ease: "easeOut",
          }}
        >
          <div className="rounded-2xl bg-slate-900/80 p-5 shadow-2xl shadow-black/30 ring-1 ring-white/10 backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Boxes className="size-4 text-brand-gold" />
                  <h3 className="text-base font-semibold text-white">Live inventory activity</h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Stock levels from the catalog data currently loaded.
                </p>
              </div>

              <span
                role="status"
                aria-live="polite"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1",
                  connected
                    ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
                    : "bg-amber-400/10 text-amber-300 ring-amber-400/30",
                )}
              >
                <span className="relative flex size-1.5">
                  {connected ? (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  ) : null}
                  <span
                    className={cn(
                      "relative inline-flex size-1.5 rounded-full",
                      connected ? "bg-emerald-400" : "bg-amber-400",
                    )}
                  />
                </span>
                {connected ? "Live" : "Reconnecting"}
              </span>
            </div>

            {loading ? (
              <InventorySkeleton />
            ) : visibleComponents.length === 0 ? (
              <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                <Boxes className="size-8 text-slate-500" />
                <p className="mt-3 text-sm font-medium text-slate-200">No inventory loaded yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                  Refresh the page to pull the latest catalog and stock levels.
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {visibleComponents.map((component, index) => {
                  const key = component._id ?? component.id ?? `${component.sku}-${index}`;

                  return (
                    <li
                      key={key}
                      className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {component.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                            {component.category}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                            stockTone(component.stock),
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", dotTone(component.stock))} />
                          {stockLabel(component.stock)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {component.stock} {component.stock === 1 ? "unit" : "units"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3" />
                          {formatRelativeTime(component.updatedAt)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && components.length > 0 ? (
              <p className="mt-4 text-center font-mono text-[10px] tracking-wide text-slate-500">
                Showing {visibleComponents.length} of {components.length} loaded items
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
              <Link
                to="/components"
                className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-brand-navy transition-colors hover:bg-slate-100"
              >
                Browse inventory
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Track your order
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
