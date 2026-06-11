import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatNaira, useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — PulseLab" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useStore((s) => s.cart);
  const components = useStore((s) => s.components);
  const setQuantity = useStore((s) => s.setQuantity);
  const removeFromCart = useStore((s) => s.removeFromCart);

  const items = cart.map((ci) => ({ ci, c: components.find((c) => c.id === ci.componentId)! })).filter((x) => x.c);
  const total = items.reduce((s, { ci, c }) => s + c.price * ci.quantity, 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-4xl font-bold text-brand-navy mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <p className="text-slate-500">Your cart is empty.</p>
            <Link to="/components" className="mt-6 inline-block rounded-lg bg-brand-navy text-white px-6 py-3 font-semibold hover:bg-slate-800 transition-colors">
              Browse components
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-3">
              <AnimatePresence>
                {items.map(({ ci, c }) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="size-16 rounded-lg bg-slate-50 grid place-items-center text-3xl">{c.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-navy truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.sku}</div>
                    </div>
                    <div className="flex items-center rounded-lg border border-slate-200">
                      <button onClick={() => setQuantity(c.id, ci.quantity - 1)} className="size-9 grid place-items-center hover:bg-slate-50"><Minus className="size-3.5" /></button>
                      <span className="w-10 text-center text-sm font-semibold">{ci.quantity}</span>
                      <button onClick={() => setQuantity(c.id, Math.min(c.stock, ci.quantity + 1))} className="size-9 grid place-items-center hover:bg-slate-50"><Plus className="size-3.5" /></button>
                    </div>
                    <div className="w-24 text-right font-bold text-brand-navy">{formatNaira(c.price * ci.quantity)}</div>
                    <button onClick={() => removeFromCart(c.id)} className="size-9 grid place-items-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="size-4" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 h-fit sticky top-24">
              <h3 className="font-mono text-[10px] tracking-widest uppercase text-slate-400 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{formatNaira(total)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-semibold text-green-600">Free</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-lg">
                <span className="font-bold text-brand-navy">Total</span>
                <motion.span key={total} initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="font-bold text-brand-navy">{formatNaira(total)}</motion.span>
              </div>
              <Link to="/checkout" className="mt-6 block text-center w-full h-12 leading-[3rem] rounded-lg bg-brand-navy text-white font-semibold hover:bg-slate-800 active:scale-[0.98] transition">Checkout</Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}