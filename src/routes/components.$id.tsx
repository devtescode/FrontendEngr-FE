import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ComponentCard } from "@/components/ComponentCard";
import { formatNaira, useStore } from "@/lib/store";

export const Route = createFileRoute("/components/$id")({
  head: () => ({ meta: [{ title: "Component — PulseLab" }] }),
  component: ComponentDetail,
});

function ComponentDetail() {
  const { id } = useParams({ from: "/components/$id" });
  const component = useStore((s) => s.components.find((c) => c.id === id));
  const related = useStore((s) => s.components.filter((c) => c.id !== id && c.category === component?.category).slice(0, 3));
  const addToCart = useStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);

  if (!component) return <Navigate to="/components" />;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/components" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-navy mb-8">
          <ArrowLeft className="size-4" /> Back to catalog
        </Link>
        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="aspect-square rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 grid place-items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-circuit opacity-40" />
            <span className="relative text-[12rem]">{component.emoji}</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="font-mono text-[10px] tracking-widest text-brand-accent uppercase">{component.category} · {component.sku}</span>
            <h1 className="text-4xl font-bold text-brand-navy mt-2">{component.name}</h1>
            <p className="mt-4 text-slate-500">{component.description}</p>

            <div className="mt-8 flex items-baseline gap-4">
              <span className="text-5xl font-bold text-brand-navy">{formatNaira(component.price)}</span>
              {component.stock > 0
                ? <span className="text-sm font-semibold text-green-600">{component.stock} in stock</span>
                : <span className="text-sm font-semibold text-red-600">Out of stock</span>}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="size-11 grid place-items-center hover:bg-slate-50"><Minus className="size-4" /></button>
                <span className="w-12 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty(Math.min(component.stock, qty + 1))} className="size-11 grid place-items-center hover:bg-slate-50"><Plus className="size-4" /></button>
              </div>
              <button
                disabled={component.stock === 0}
                onClick={() => addToCart(component.id, qty)}
                className="flex-1 h-11 rounded-lg bg-brand-navy text-white font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition"
              >Add to Cart</button>
            </div>

            <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400 mb-3">Specifications</h3>
              <p className="text-brand-navy leading-relaxed">{component.details}</p>
            </div>
          </motion.div>
        </div>

        {related.length > 0 && (
          <div className="mt-24">
            <h2 className="text-2xl font-bold text-brand-navy mb-8">Related components</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c, i) => <ComponentCard key={c.id} c={c} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}