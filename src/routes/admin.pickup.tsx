import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CheckCircle2,
  XCircle,
  Package,
  User,
  Hash,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { useStore, type Order } from "@/lib/store";

export const Route = createFileRoute("/admin/pickup")({
  head: () => ({
    meta: [{ title: "Student Pickup — Admin" }],
  }),
  component: PickupPage,
});

function PickupPage() {
  const orders = useStore((s) => s.orders);
  const updateStatus = useStore((s) => s.updateOrderStatus);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Order[] | "notfound" | null>(
    null
  );

  const search = (e: React.FormEvent) => {
    e.preventDefault();

    const matric = query.trim().toUpperCase();

    if (!matric) {
      setResults("notfound");
      return;
    }

    const foundOrders = orders.filter(
      (order) =>
        order.matric?.trim().toUpperCase() === matric
    );

    setResults(
      foundOrders.length > 0
        ? foundOrders
        : "notfound"
    );
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-accent">
            <ShoppingBag className="h-4 w-4" />
            Student Pickup
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Find Student Order
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Enter the student's matric number to view their
            orders, ordered products and pickup status.
          </p>
        </div>

        {/* SEARCH CARD */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">

          <form
            onSubmit={search}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Enter student's matric number..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950 pl-12 pr-4 text-base font-medium text-white outline-none placeholder:text-slate-600 transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10"
              />
            </div>

            <button
              type="submit"
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-accent px-7 font-semibold text-white transition hover:opacity-90"
            >
              <Search className="h-5 w-5" />
              Find Student
            </button>
          </form>

          <p className="mt-3 text-xs text-slate-600">
            Example: 2023/CSC/001
          </p>
        </div>

        {/* RESULTS */}
        <AnimatePresence mode="wait">

          {/* NOT FOUND */}
          {results === "notfound" && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10">
                  <XCircle className="h-8 w-8 text-red-400" />
                </div>

                <h2 className="text-lg font-bold text-white">
                  No order found
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  No order was found for matric number{" "}
                  <span className="font-semibold text-slate-300">
                    {query}
                  </span>
                  .
                </p>

                <button
                  onClick={clearSearch}
                  className="mt-5 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Search Again
                </button>
              </div>
            </motion.div>
          )}

          {/* ORDERS FOUND */}
          {Array.isArray(results) && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >

              {/* STUDENT PROFILE */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl md:p-6">

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-4">

                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent">
                      <User className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                        Student
                      </p>

                      <h2 className="mt-1 text-xl font-bold text-white">
                        {results[0].userName}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-brand-accent">
                        {results[0].matric}
                      </p>
                    </div>

                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                      Orders
                    </p>

                    <p className="mt-1 text-xl font-bold text-white">
                      {results.length}
                    </p>
                  </div>

                </div>
              </div>

              {/* ORDER CARDS */}
              {results.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  updateStatus={updateStatus}
                />
              ))}

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

/* =====================================================
   ORDER CARD
===================================================== */

function OrderCard({
  order,
  updateStatus,
}: {
  order: Order;
  updateStatus: (
    id: string,
    status: Order["status"]
  ) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl"
    >

      {/* ORDER HEADER */}
      <div className="border-b border-white/10 bg-white/[0.02] p-5 md:p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-accent" />

              <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                Order
              </span>
            </div>

            <h3 className="mt-1 text-xl font-bold text-white">
              #{order.id}
            </h3>
          </div>

          <OrderStatus status={order.status} />

        </div>
      </div>

      {/* ORDER INFORMATION */}
      <div className="grid gap-4 border-b border-white/10 p-5 sm:grid-cols-2 md:grid-cols-3 md:p-6">

        <Info
          label="Student"
          value={order.userName}
        />

        <Info
          label="Matric Number"
          value={order.matric}
        />

        <Info
          label="Order Total"
          value={`₦${order.total.toLocaleString()}`}
        />

      </div>

      {/* PRODUCTS */}
      <div className="p-5 md:p-6">

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white">
              Ordered Products
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              {order.items.length} product
              {order.items.length !== 1 && "s"}
            </p>
          </div>
        </div>

        <div className="space-y-3">

          {order.items.map((item) => (
            <div
              key={item.componentId}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/70 p-4"
            >

              <div className="flex min-w-0 items-center gap-4">

                {/* PRODUCT IMAGE */}
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">

                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-slate-700" />
                  )}

                </div>

                {/* PRODUCT INFO */}
                <div className="min-w-0">

                  <p className="truncate font-semibold text-white">
                    {item.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Product ID: {item.componentId}
                  </p>

                </div>

              </div>

              {/* QUANTITY */}
              <div className="shrink-0 rounded-xl bg-brand-accent/10 px-3 py-2 text-sm font-bold text-brand-accent">
                × {item.quantity}
              </div>

            </div>
          ))}

        </div>

      </div>

      {/* FOOTER / PICKUP ACTION */}
      <div className="border-t border-white/10 bg-white/[0.02] p-5 md:p-6">

        {order.status === "Ready" ? (

          <button
            onClick={() => {
              updateStatus(
                order.id,
                "Collected"
              );
            }}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-bold text-white transition hover:bg-green-600"
          >
            <CheckCircle2 className="h-5 w-5" />
            Hand Over & Mark as Collected
          </button>

        ) : order.status === "Collected" ? (

          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-4 text-sm font-medium text-slate-400">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            This order has already been collected
          </div>

        ) : (

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-center">
            <p className="text-sm font-medium text-amber-400">
              Order is not ready for pickup
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Current status: {order.status}
            </p>
          </div>

        )}

      </div>

    </motion.div>
  );
}

/* =====================================================
   STATUS
===================================================== */

function OrderStatus({
  status,
}: {
  status: Order["status"];
}) {
  const styles =
    status === "Ready"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : status === "Collected"
      ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
      : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <span
      className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider ${styles}`}
    >
      {status}
    </span>
  );
}

/* =====================================================
   INFO
===================================================== */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}