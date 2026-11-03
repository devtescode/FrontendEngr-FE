import { Boxes, MapPin, Radio, ShieldCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useSocketConnected } from "@/hooks/useSocketConnected";

type StatsSectionProps = {
  totalItems: number;
  loading?: boolean;
  error?: boolean;
};

type StatCellProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone: string;
  className?: string;
  liveDot?: boolean;
  live?: boolean;
};

export function StatsSection({ totalItems, loading = false, error = false }: StatsSectionProps) {
  const connected = useSocketConnected();
  const showPlaceholder = (loading || error) && totalItems === 0;

  return (
    <div
      aria-busy={loading}
      className="grid w-full grid-cols-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-premium md:grid-cols-4"
    >
      <StatCell
        icon={Boxes}
        label="Components listed"
        tone="bg-brand-gold/10 text-brand-gold"
        className="border-b border-slate-100 md:border-b-0 md:border-r"
        value={
          <span aria-live="polite" className="tabular-nums">
            {showPlaceholder ? (
              <span className="text-brand-navy/40">—</span>
            ) : (
              <AnimatedCounter value={totalItems} />
            )}
          </span>
        }
      />

      <StatCell
        icon={Radio}
        label="Live stock sync"
        tone="bg-brand-accent/10 text-brand-accent"
        className="border-b border-l border-slate-100 md:border-b-0 md:border-l-0 md:border-r"
        liveDot
        live={connected}
        value={connected ? "Socket-connected" : "Reconnecting"}
      />

      <StatCell
        icon={MapPin}
        label="Campus pickup"
        tone="bg-brand-gold/10 text-brand-gold"
        className="border-l border-slate-100 md:border-l-0 md:border-r"
        value="At the EU lab"
      />

      <StatCell
        icon={ShieldCheck}
        label="Secure checkout"
        tone="bg-brand-accent/10 text-brand-accent"
        value="Powered by Paystack"
      />
    </div>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  tone,
  className = "",
  liveDot = false,
  live = true,
}: StatCellProps) {
  return (
    <div
      className={`flex min-h-[164px] min-w-0 flex-col justify-between gap-5 p-5 sm:p-6 ${className}`}
    >
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xl font-bold leading-tight tracking-tight text-brand-navy sm:text-2xl">
          <span className="min-w-0 break-words">{value}</span>
          {liveDot && (
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span
                className={`absolute inline-flex size-full rounded-full ${
                  live
                    ? "animate-ping bg-emerald-400 opacity-75 motion-reduce:animate-none"
                    : "bg-amber-400/60"
                }`}
              />
              <span
                className={`relative inline-flex size-2 rounded-full ${
                  live ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
          )}
          {liveDot && <span className="sr-only">{live ? "Live" : "Reconnecting"}</span>}
        </div>

        <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}
