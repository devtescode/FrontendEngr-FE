import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Component } from "@/lib/data";
import { formatNaira, useStore } from "@/lib/store";

export function ComponentCard({ c, index = 0 }: { c: Component; index?: number }) {
  const addToCart = useStore((s) => s.addToCart);
  const stockBadge =
    c.stock === 0 ? (
      <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">Out of Stock</span>
    ) : c.stock < 10 ? (
      <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Low Stock</span>
    ) : (
      <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">{c.stock} In Stock</span>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-2xl hover:shadow-slate-200/60"
    >
      <Link to="/components/$id" params={{ id: c.id }} className="block">
        <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 outline-1 -outline-offset-1 outline-black/5 grid place-items-center mb-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-circuit opacity-40" />
          <span className="relative text-6xl">{c.emoji}</span>
        </div>
        <div className="px-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold tracking-widest text-brand-accent uppercase">{c.category}</span>
            {stockBadge}
          </div>
          <h3 className="mt-2 text-xl font-bold text-brand-navy">{c.name}</h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{c.description}</p>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-2xl font-bold text-brand-navy">{formatNaira(c.price)}</span>
            <button
              type="button"
              disabled={c.stock === 0}
              onClick={(e) => { e.preventDefault(); addToCart(c.id); }}
              className="rounded-lg bg-brand-navy/5 px-4 py-2 text-sm font-bold text-brand-navy transition-colors group-hover:bg-brand-gold group-hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {c.stock === 0 ? "Out" : "Add to Cart"}
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}