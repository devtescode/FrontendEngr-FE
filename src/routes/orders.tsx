import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusPill } from "./dashboard";
import { formatNaira, useCurrentUser, useStore } from "@/lib/store";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — PulseLab" }] }),
  component: () => <RequireAuth role="student"><OrdersPage /></RequireAuth>,
});

function OrdersPage() {
  const user = useCurrentUser()!;
  const orders = useStore((s) => s.orders.filter((o) => o.userId === user.id));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-4xl font-bold text-brand-navy mb-2">My Orders</h1>
        <p className="text-slate-500 mb-10">Track every order from payment to pickup.</p>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <p className="text-slate-500">You haven't placed any orders yet.</p>
            <Link to="/components" className="mt-6 inline-block rounded-lg bg-brand-navy text-white px-6 py-3 font-semibold hover:bg-slate-800">Start browsing</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Order ID</div>
                    <div className="text-xl font-bold text-brand-navy">#{o.id}</div>
                  </div>
                  <StatusPill status={o.status} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Placed</div>
                    <div className="text-brand-navy">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Items</div>
                    <div className="text-brand-navy">{o.items.reduce((a, i) => a + i.quantity, 0)} units</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Total</div>
                    <div className="font-bold text-brand-navy">{formatNaira(o.total)}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
                  {o.items.map((i) => i.name + " × " + i.quantity).join(" · ")}
                </div>
                {o.status === "Ready" && (
                  <div className="mt-4 rounded-lg bg-brand-gold/10 border border-brand-gold/20 p-3 text-sm text-brand-gold font-semibold">
                    Ready for pickup — show this Order ID at the lab.
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}