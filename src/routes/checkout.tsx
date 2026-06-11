import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { formatNaira, useCurrentUser, useStore } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — PulseLab" }] }),
  component: () => <RequireAuth role="student"><CheckoutPage /></RequireAuth>,
});

function CheckoutPage() {
  const user = useCurrentUser()!;
  const cart = useStore((s) => s.cart);
  const components = useStore((s) => s.components);
  const placeOrder = useStore((s) => s.placeOrder);
  const navigate = useNavigate();
  const [stage, setStage] = useState<"review" | "paying" | "done">("review");
  const [orderId, setOrderId] = useState<string | null>(null);

  if (cart.length === 0 && stage === "review") return <Navigate to="/cart" />;

  const items = cart.map((ci) => ({ ci, c: components.find((c) => c.id === ci.componentId)! }));
  const total = items.reduce((s, { ci, c }) => s + c.price * ci.quantity, 0);

  const pay = async () => {
    setStage("paying");
    await new Promise((r) => setTimeout(r, 1800));
    const order = placeOrder();
    if (order) {
      setOrderId(order.id);
      setStage("done");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-12">
        {stage !== "done" && <h1 className="text-4xl font-bold text-brand-navy mb-8">Checkout</h1>}

        {stage === "review" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card title="Student">
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-semibold">{user.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Matric</span><span className="font-mono text-sm">{user.matric}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-sm">{user.email}</span></div>
            </Card>

            <Card title="Order Summary">
              <div className="space-y-2">
                {items.map(({ ci, c }) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span>{c.name} <span className="text-slate-400">× {ci.quantity}</span></span>
                    <span className="font-semibold">{formatNaira(c.price * ci.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
                <span className="font-bold text-brand-navy">Total</span>
                <span className="font-bold text-brand-navy text-lg">{formatNaira(total)}</span>
              </div>
            </Card>

            <button onClick={pay} className="w-full h-12 rounded-lg bg-brand-gold text-white font-semibold hover:bg-amber-700 active:scale-[0.98] transition">
              Pay {formatNaira(total)}
            </button>
          </motion.div>
        )}

        {stage === "paying" && (
          <div className="py-32 text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="inline-block">
              <Loader2 className="size-12 text-brand-accent" />
            </motion.div>
            <p className="mt-6 text-slate-500">Processing payment...</p>
          </div>
        )}

        {stage === "done" && orderId && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="inline-flex">
              <CheckCircle2 className="size-20 text-green-500" />
            </motion.div>
            <h2 className="text-3xl font-bold text-brand-navy mt-6">Payment successful</h2>
            <p className="text-slate-500 mt-2">Your order has been placed. Show your Order ID at the lab for pickup.</p>
            <div className="mt-8 inline-block rounded-xl border-2 border-dashed border-brand-gold/40 bg-brand-gold/5 px-8 py-4">
              <div className="text-xs font-mono uppercase tracking-widest text-brand-gold">Order ID</div>
              <div className="text-3xl font-bold text-brand-navy mt-1">#{orderId}</div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/orders" className="rounded-lg bg-brand-navy text-white px-6 py-3 font-semibold hover:bg-slate-800">View my orders</Link>
              <button onClick={() => navigate({ to: "/components" })} className="rounded-lg border border-slate-200 bg-white px-6 py-3 font-semibold text-brand-navy hover:bg-slate-50">Keep browsing</button>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="font-mono text-[10px] tracking-widest uppercase text-slate-400 mb-4">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}