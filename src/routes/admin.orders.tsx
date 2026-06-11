import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useStore, type OrderStatus } from "@/lib/store";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }] }),
  component: AdminOrders,
});

const FILTERS: (OrderStatus | "All")[] = ["All", "Paid", "Preparing", "Ready", "Collected"];
const NEXT: Record<OrderStatus, OrderStatus | null> = {
  Paid: "Preparing",
  Preparing: "Ready",
  Ready: "Collected",
  Collected: null,
};

function AdminOrders() {
  const orders = useStore((s) => s.orders);
  const updateStatus = useStore((s) => s.updateOrderStatus);
  const [filter, setFilter] = useState<(OrderStatus | "All")>("All");

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
      <p className="text-slate-500 text-sm">Manage incoming orders and update their status.</p>

      <div className="flex flex-wrap gap-2 my-8">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filter === f ? "bg-brand-accent text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-950 p-16 text-center text-slate-500">No orders match this filter.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o, i) => {
            const next = NEXT[o.status];
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/5 bg-slate-950 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-11 rounded-full bg-brand-accent/15 text-brand-accent grid place-items-center font-bold text-sm">
                      {o.userName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="text-white font-semibold">#{o.id} · {o.userName}</div>
                      <div className="text-xs text-slate-500 font-mono">{o.matric} · ₦{o.total.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/5 text-brand-gold">{o.status}</span>
                    {next && (
                      <button onClick={() => updateStatus(o.id, next)}
                        className="rounded-lg bg-brand-gold text-white px-4 py-2 text-sm font-semibold hover:bg-amber-700">
                        Mark as {next}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 text-sm text-slate-400">
                  {o.items.map((i) => `${i.name} × ${i.quantity}`).join(" · ")}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}