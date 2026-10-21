import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt as ReceiptIcon,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Hash,
  Wallet,
  X,
  Printer,
  Share2,
  Copy,
  Check,
  Package,
  CreditCard,
  Building2,
  Mail,
  Phone,
  Sparkles,
  Shield,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useOrdersQuery } from "@/hooks/useOrdersQuery";
import type {
  NormalizedOrder,
  NormalizedOrderItem,
} from "@/lib/normalize";
import logoImg from "../components/Assets/image.webp";

export const Route = createFileRoute("/receipts")({
  head: () => ({ meta: [{ title: "Receipts - EU Hardwarestore" }] }),
  component: () => (
    <RequireAuth role="student">
      <ReceiptsIndexPage />
    </RequireAuth>
  ),
});
const BRAND = {
  name: "EU Hardwarestore",
  tagline: "Engineering Components Store",
  address: "Engineering Building, Room 204",
  phone: "+234 806 486 4821",
  email: "support@euhardwarestore.ng",
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

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// =====================================================
// PAGE
// =====================================================

function ReceiptsIndexPage() {
  // Shares its cache with /orders — one request serves both pages.
  const {
    orders,
    isLoading: loading,
    isError,
    error: queryError,
    refetch,
  } = useOrdersQuery();

  const error = isError ? "Unable to load your receipts." : null;

  // Currently open receipt (null = modal closed)
  const [openOrder, setOpenOrder] = useState<NormalizedOrder | null>(null);

  // ===================================================
  // LOCK BODY SCROLL WHEN MODAL IS OPEN
  // ===================================================
  useEffect(() => {
    if (openOrder) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [openOrder]);

  // ===================================================
  // ESC TO CLOSE
  // ===================================================
  useEffect(() => {
    if (!openOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOrder(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openOrder]);

  // ===================================================
  // STATS
  // ===================================================
  const stats = useMemo(() => {
    const total = orders.reduce((a, o) => a + o.total, 0);
    const units = orders.reduce(
      (a, o) => a + o.items.reduce((b, i) => b + i.quantity, 0),
      0
    );
    return { total, count: orders.length, units };
  }, [orders]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-navy/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-brand-navy">
            <ReceiptIcon className="size-3" />
            Purchase Receipts
          </div>
          <h1 className="text-4xl font-bold text-brand-navy">
            Order Receipts
          </h1>
          <p className="mt-2 text-slate-500">
            Every successful payment tap any to view, share, or print.
          </p>
        </div>

        {/* STATS STRIP */}
        {!loading && !error && orders.length > 0 && (
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<ReceiptIcon className="size-4" />}
              label="Receipts"
              value={String(stats.count)}
            />
            <StatCard
              icon={<Hash className="size-4" />}
              label="Items Bought"
              value={String(stats.units)}
            />
            <StatCard
              icon={<Wallet className="size-4" />}
              label="Total Spent"
              value={formatNaira(stats.total)}
              highlight
            />
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <ReceiptRowSkeleton key={i} index={i} />
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 size-8 text-red-600" />
            <p className="font-semibold text-red-700">
              Couldn't load receipts
            </p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <ShoppingBag className="mx-auto mb-5 size-12 text-slate-300" />
            <h2 className="text-xl font-semibold text-brand-navy">
              No receipts yet
            </h2>
            <p className="mt-2 text-slate-500">
              Once you complete a payment, your receipt will appear here.
            </p>
            <Link
              to="/components"
              className="mt-6 inline-block rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Start browsing
            </Link>
          </div>
        )}

        {/* RECEIPTS LIST */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order, index) => (
              <motion.button
                key={order.id}
                type="button"
                onClick={() => setOpenOrder(order)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-navy hover:shadow-lg"
              >
                {/* LEFT ICON BLOCK */}

                <div className="size-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-brand-navy to-slate-800 shadow-md transition-transform duration-300 hover:scale-105">
                  <img
                    src={logoImg}
                    // alt={BRAND.name}
                    className="h-full w-full object-cover"
                  />
                </div>


                {/* INFO */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-green-700 ring-1 ring-green-200/60">
                      <CheckCircle2 className="size-3" />
                      Paid
                    </span>
                    {order.channel && (
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">
                        {order.channel.replace("_", " ")}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 truncate font-mono text-[11px] text-slate-500">
                    {order.reference}
                  </div>

                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(order.paidAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Hash className="size-3" />
                      {order.items.reduce((a, i) => a + i.quantity, 0)}{" "}
                      items
                    </span>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Total
                  </div>
                  <div className="text-lg font-bold text-brand-navy">
                    {formatNaira(order.total)}
                  </div>
                </div>

                {/* CHEVRON */}
                <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-navy" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          RECEIPT MODAL
      ===================================================== */}
      <ReceiptModal
        order={openOrder}
        onClose={() => setOpenOrder(null)}
      />
    </AppShell>
  );
}

/* ============================================================
   RECEIPT MODAL
============================================================ */

function ReceiptModal({
  order,
  onClose,
}: {
  order: NormalizedOrder | null;
  onClose: () => void;
}) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const copyReference = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch { }
  };

  const handleShare = async () => {
    if (!order) return;

    const text =
      `Receipt from ${BRAND.name}\n` +
      `Reference: ${order.reference}\n` +
      `Date: ${formatDateTime(order.paidAt)}\n` +
      `Total: ${formatNaira(order.total)}\n` +
      `Items: ${order.items
        .map((i) => `${i.name} × ${i.quantity}`)
        .join(", ")}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${order.reference}`,
          text,
          url: window.location.href,
        });
        return;
      } catch { }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch { }
  };

  const handlePrint = () => window.print();

  return (
    <AnimatePresence>
      {order && (
        <>
          {/* PRINT STYLES */}
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #receipt-print-area,
              #receipt-print-area * { visibility: visible !important; }
              #receipt-print-area {
                position: absolute !important;
                left: 0; top: 0;
                width: 100%;
                max-width: 420px;
                margin: 0 auto;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* MODAL */}
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative my-auto w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={onClose}
                aria-label="Close receipt"
                className="no-print absolute -top-2 -right-2 z-10 grid size-10 place-items-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-brand-navy"
              >
                <X className="size-5" />
              </button>

              {/* =====================================================
                  RECEIPT CARD
              ===================================================== */}
              <div
                id="receipt-print-area"
                className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
              >
                {/* HERO */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-brand-navy px-6 pb-8 pt-6 text-white">
                  <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-navy/40 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-emerald-500/10 blur-3xl" />

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10  ring-white/20 sm:size-11">
                          <img
                            src={logoImg}
                            alt={BRAND.name}
                            className="block h-full w-full object-contain p-0.5"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold tracking-tight">
                            {BRAND.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-white/50">
                            {BRAND.tagline}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20 backdrop-blur-sm">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white/90">
                          Receipt
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 ring-1 ring-emerald-400/30">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                          Payment Successful
                        </span>
                      </div>

                      <div className="mt-3 text-[10px] uppercase tracking-widest text-white/40">
                        Amount Paid
                      </div>
                      <div className="mt-1 text-4xl font-bold tracking-tight">
                        {formatNaira(order.total)}
                      </div>

                      <div className="mt-2 text-xs text-white/50">
                        {formatDateTime(order.paidAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ZIGZAG */}
                <div className="relative -mt-px h-3 bg-slate-900">
                  <svg
                    viewBox="0 0 400 12"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                  >
                    <path
                      d="M0,0 L10,12 L20,0 L30,12 L40,0 L50,12 L60,0 L70,12 L80,0 L90,12 L100,0 L110,12 L120,0 L130,12 L140,0 L150,12 L160,0 L170,12 L180,0 L190,12 L200,0 L210,12 L220,0 L230,12 L240,0 L250,12 L260,0 L270,12 L280,0 L290,12 L300,0 L310,12 L320,0 L330,12 L340,0 L350,12 L360,0 L370,12 L380,0 L390,12 L400,0 L400,12 L0,12 Z"
                      fill="white"
                    />
                  </svg>
                </div>

                {/* META */}
                <div className="border-b border-dashed border-slate-200 px-6 py-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetaCell
                      label="Reference"
                      value={
                        <button
                          onClick={copyReference}
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 transition hover:text-brand-navy"
                        >
                          <span className="truncate max-w-[150px]">
                            {order.reference}
                          </span>
                          {copiedRef ? (
                            <Check className="size-3 shrink-0 text-green-600" />
                          ) : (
                            <Copy className="size-3 shrink-0 text-slate-400" />
                          )}
                        </button>
                      }
                    />

                    <MetaCell
                      label="Payment Method"
                      value={
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-slate-700">
                          {order.channel === "card" ? (
                            <CreditCard className="size-3.5 text-slate-400" />
                          ) : (
                            <Building2 className="size-3.5 text-slate-400" />
                          )}
                          {order.channel?.replace("_", " ") || "—"}
                        </span>
                      }
                    />
                  </div>
                </div>

                {/* ITEMS */}
                <div className="px-6 py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                      <Package className="size-3.5" />
                      Items ({order.items.length})
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-400">
                      {order.items.reduce((a, i) => a + i.quantity, 0)}{" "}
                      units
                    </div>
                  </div>

                  <ul className="space-y-2.5">
                    {order.items.map((item, idx) => (
                      <ItemRow
                        key={`${order.id}-${idx}`}
                        item={item}
                      />
                    ))}
                  </ul>
                </div>

                {/* TOTALS */}
                <div className="border-t border-dashed border-slate-200 px-6 py-5">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-700">
                        {formatNaira(order.total)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Pickup</span>
                      <span className="font-semibold text-emerald-600">
                        Free
                      </span>
                    </div>

                    <div className="my-3 border-t border-dashed border-slate-200" />

                    <div className="flex items-center justify-between rounded-xl bg-brand-navy/5 px-3 py-2.5">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-navy">
                        Total Paid
                      </span>
                      <span className="text-lg font-bold text-brand-navy">
                        {formatNaira(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="border-t border-dashed border-slate-200 bg-slate-50/60 px-6 py-5 text-center">
                  <div className="mx-auto mb-3 grid size-9 place-items-center rounded-full bg-emerald-100">
                    <Shield className="size-4 text-emerald-600" />
                  </div>

                  <p className="text-xs font-semibold text-brand-navy">
                    This is a computer-generated receipt
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    No signature required. Keep this for your records.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3 text-slate-400" />
                      {BRAND.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3 text-slate-400" />
                      {BRAND.phone}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="h-px w-10 bg-slate-300" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                      Thank you
                    </span>
                    <div className="h-px w-10 bg-slate-300" />
                  </div>
                </div>
              </div>

              {/* =====================================================
                  MODAL ACTION BAR
              ===================================================== */}
              <div className="no-print mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {copiedShare ? (
                    <>
                      <Check className="size-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="size-4" />
                      Share
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Printer className="size-4" />
                  Print / Save
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   SUB-COMPONENTS
============================================================ */

function MetaCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-1 truncate">{value}</div>
    </div>
  );
}

function ItemRow({ item }: { item: NormalizedOrderItem }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-2.5 ring-1 ring-slate-100">
      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="size-4 text-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-brand-navy">
          {item.name}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {formatNaira(item.price)} × {item.quantity}
        </div>
      </div>

      <div className="shrink-0 text-right text-sm font-bold text-brand-navy">
        {formatNaira(item.price * item.quantity)}
      </div>
    </li>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${highlight
        ? "border-brand-navy bg-brand-navy text-white"
        : "border-slate-200 bg-white"
        }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`grid size-8 place-items-center rounded-lg ${highlight
            ? "bg-white/10 text-white"
            : "bg-slate-100 text-slate-500"
            }`}
        >
          {icon}
        </div>
        <span
          className={`text-[10px] font-medium uppercase tracking-widest ${highlight ? "text-white/70" : "text-slate-400"
            }`}
        >
          {label}
        </span>
      </div>

      <div
        className={`mt-3 text-xl font-bold ${highlight ? "text-white" : "text-brand-navy"
          }`}
      >
        {value}
      </div>
    </div>
  );
}

function ReceiptRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="size-14 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="size-4 shrink-0 animate-pulse rounded bg-slate-200" />
    </motion.div>
  );
}
