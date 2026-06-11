import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { useStore, type Order } from "@/lib/store";

export const Route = createFileRoute("/admin/pickup")({
  head: () => ({ meta: [{ title: "Pickup — Admin" }] }),
  component: PickupPage,
});

function PickupPage() {
  const orders = useStore((s) => s.orders);
  const updateStatus = useStore((s) => s.updateOrderStatus);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Order | "notfound" | null>(null);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().replace(/^#/, "").toUpperCase();
    const found = orders.find((o) => o.id.toUpperCase() === trimmed);
    setResult(found ?? "notfound");
  };

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Order Pickup</h1>
      <p className="text-slate-500 text-sm mb-8">Enter the student's Order ID to verify and hand over items.</p>

      <form onSubmit={search} className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. EU-12345"
            className="w-full h-13 pl-11 pr-4 rounded-xl bg-slate-950 border border-white/10 text-white text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent" />
        </div>
        <button className="px-6 rounded-xl bg-brand-accent text-white font-semibold hover:bg-blue-600">Verify</button>
      </form>

      <AnimatePresence mode="wait">
        {result === "notfound" && (
          <motion.div key="nf" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-center gap-4">
            <XCircle className="size-8 text-red-400" />
            <div>
              <div className="font-bold text-red-400">Order not found</div>
              <div className="text-sm text-slate-400">Double-check the ID with the student.</div>
            </div>
          </motion.div>
        )}
        {result && result !== "notfound" && (
          <motion.div key={result.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 bg-slate-950 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Order</div>
                <div className="text-2xl font-bold text-white">#{result.id}</div>
              </div>
              <span className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-widest ${result.status === "Ready" ? "bg-green-500/15 text-green-400" : result.status === "Collected" ? "bg-slate-500/15 text-slate-400" : "bg-amber-500/15 text-amber-400"}`}>{result.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Info label="Student" value={result.userName} />
              <Info label="Matric" value={result.matric} />
              <Info label="Total" value={`₦${result.total.toLocaleString()}`} />
              <Info label="Placed" value={new Date(result.createdAt).toLocaleString()} />
            </div>

            <div className="rounded-xl bg-white/5 p-4 mb-6">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Items</div>
              <ul className="space-y-1 text-sm text-white">
                {result.items.map((i) => <li key={i.componentId}>{i.name} × {i.quantity}</li>)}
              </ul>
            </div>

            {result.status === "Ready" ? (
              <button onClick={() => { updateStatus(result.id, "Collected"); setResult({ ...result, status: "Collected" }); }}
                className="w-full h-12 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 flex items-center justify-center gap-2">
                <CheckCircle2 className="size-5" /> Hand over · Mark as Collected
              </button>
            ) : result.status === "Collected" ? (
              <div className="rounded-xl bg-slate-800 p-4 text-sm text-slate-400 text-center">This order has already been collected.</div>
            ) : (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm text-amber-400 text-center">
                Order is not yet ready for pickup. Current status: <strong>{result.status}</strong>.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-white mt-1">{value}</div>
    </div>
  );
}