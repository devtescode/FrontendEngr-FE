import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Receipt as ReceiptIcon,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Hash,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  ordersCache,
  loadOrders,
  type Order,
} from "@/lib/ordersStore";

export const Route = createFileRoute("/receipts")({
  head: () => ({ meta: [{ title: "Receipts — PulseLab" }] }),
  component: () => (
    <RequireAuth role="student">
      <ReceiptsIndexPage />
    </RequireAuth>
  ),
});

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function ReceiptsIndexPage() {
  const [orders, setOrders] = useState<Order[]>(() => ordersCache);
  const [loading, setLoading] = useState(ordersCache.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (ordersCache.length > 0) {
      setOrders(ordersCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || "Unable to load receipts.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* HEADER */}
        <div className="mb-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-navy/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-brand-navy">
            <ReceiptIcon className="size-3" />
            Purchase Receipts
          </div>
          <h1 className="text-4xl font-bold text-brand-navy">
            Order Receipts
          </h1>
          <p className="mt-2 text-slate-500">
            Every successful payment, ready to view, share, or print.
          </p>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-navy" />
            <p className="text-slate-500">Loading your receipts...</p>
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
              Once you complete a payment, your receipt will
              appear here.
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
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  to="/receipts" 
                  params={{ id: order.id }}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-navy hover:shadow-md"
                >
                  {/* ICON */}
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-navy/5 text-brand-navy transition group-hover:bg-brand-navy group-hover:text-white">
                    <ReceiptIcon className="size-5" />
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-green-600">
                        <CheckCircle2 className="size-3" />
                        Paid
                      </span>
                    </div>

                    <div className="mt-1 truncate font-mono text-xs text-slate-500">
                      {order.reference}
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(order.paidAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hash className="size-3" />
                        {order.items.reduce(
                          (a, i) => a + i.quantity,
                          0
                        )}{" "}
                        items
                      </span>
                    </div>
                  </div>

                  {/* TOTAL */}
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400">
                      Total
                    </div>
                    <div className="font-bold text-brand-navy">
                      {formatNaira(order.total)}
                    </div>
                  </div>

                  {/* ARROW */}
                  <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-navy" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}