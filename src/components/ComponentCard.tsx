

import { motion } from "framer-motion";
import { Package, ShoppingCart, ArrowUpRight } from "lucide-react";
import type { BackendComponent } from "@/lib/api";

export function ComponentCard({
  c,
  index = 0,
}: {
  c: BackendComponent;
  index?: number;
}) {
  const isOutOfStock = c.stock <= 0;
  const isLowStock = c.stock > 0 && c.stock <= 5;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
      }}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
    >
      {/* IMAGE */}
      <div className="relative h-66 overflow-hidden bg-slate-50">
        {c.image ? (
          <img
            src={c.image}
            alt={c.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
            <Package className="mb-2 h-12 w-12" strokeWidth={1.5} />
            <span className="text-sm">No image available</span>
          </div>
        )}

        {/* CATEGORY */}
        <div className="absolute left-4 top-4">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            {c.category}
          </span>
        </div>

        {/* STOCK BADGE */}
        <div className="absolute right-4 top-4">
          {isOutOfStock ? (
            <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Out of stock
            </span>
          ) : isLowStock ? (
            <span className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Only {c.stock} left
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              In stock
            </span>
          )}
        </div>

        {/* VIEW BUTTON */}
        <button
          type="button"
          className="absolute bottom-4 right-4 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-white text-slate-700 opacity-0 shadow-md transition-all duration-300 hover:bg-brand-navy hover:text-white group-hover:translate-y-0 group-hover:opacity-100"
          aria-label={`View ${c.name}`}
        >
          <ArrowUpRight className="h-5 w-5" />
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-2 mx-2 mb-4 mt-3">
        {/* SKU */}
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          SKU: {c.sku}
        </p>

        {/* NAME */}
        <h3 className="line-clamp-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-brand-navy">
          {c.name}
        </h3>

        {/* DESCRIPTION */}
        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
          {c.description}
        </p>

        {/* FOOTER */}
        <div className="mt-0 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Price
            </p>

            <p className="mt-1 text-xl font-bold text-brand-navy">
              ₦{c.price.toLocaleString("en-NG")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">
              Available
            </p>

            <p
              className={`mt-1 text-sm font-semibold ${
                isOutOfStock
                  ? "text-red-500"
                  : isLowStock
                    ? "text-amber-600"
                    : "text-emerald-600"
              }`}
            >
              {c.stock} units
            </p>
          </div>
        </div>

        {/* ACTION */}
        <button
          type="button"
          disabled={isOutOfStock}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-navy/90 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          <ShoppingCart className="h-4 w-4" />

          {isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </motion.article>
  );
}