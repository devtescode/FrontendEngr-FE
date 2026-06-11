import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, ShoppingCart, Bell, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { formatNaira, useCurrentUser, useStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — PulseLab" }],
  }),
  component: () => (
    <RequireAuth role="student">
      <DashboardPage />
    </RequireAuth>
  ),
});

function DashboardPage() {
  const user = useCurrentUser()!;

  // ✅ ONLY RAW STATE FROM ZUSTAND (IMPORTANT FIX)
  const orders = useStore((s) => s.orders);
  const cart = useStore((s) => s.cart);
  const notifications = useStore((s) => s.notifications);

  // -----------------------------
  // ✅ DERIVED DATA (OUTSIDE STORE)
  // -----------------------------

  const userOrders = orders.filter((o) => o.userId === user.id);
  const active = userOrders.filter((o) => o.status !== "Collected");

  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

  const userNotifications = notifications.filter(
    (n) => n.userId === user.id
  );

  const unread = userNotifications.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
            Welcome back
          </p>

          <h1 className="text-4xl font-bold text-brand-navy mt-1">
            {user.fullName.split(" ")[0]}.
          </h1>

          <p className="text-slate-500 mt-1">
            Matric ·{" "}
            <span className="font-mono">{user.matric}</span>
          </p>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard
            icon={ClipboardList}
            label="Active Orders"
            value={active.length}
          />
          <StatCard
            icon={Package}
            label="Total Orders"
            value={userOrders.length}
          />
          <StatCard
            icon={ShoppingCart}
            label="Cart Items"
            value={cartCount}
          />
          <StatCard
            icon={Bell}
            label="Unread Alerts"
            value={unread}
            highlight
          />
        </div>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ACTIVE ORDERS */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-navy">
                Active orders
              </h2>

              <Link
                to="/orders"
                className="text-sm text-brand-accent font-semibold"
              >
                View all →
              </Link>
            </div>

            {active.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No active orders.{" "}
                <Link to="/components" className="text-brand-accent">
                  Browse components
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {active.slice(0, 5).map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                  >
                    <div>
                      <div className="font-semibold text-brand-navy">
                        #{o.id}
                      </div>

                      <div className="text-xs text-slate-500">
                        {o.items.length} item{o.items.length > 1 && "s"} ·{" "}
                        {formatNaira(o.total)}
                      </div>
                    </div>

                    <StatusPill status={o.status} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* NOTIFICATIONS */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-lg font-bold text-brand-navy mb-6">
              Recent notifications
            </h2>

            {userNotifications.length === 0 ? (
              <p className="text-sm text-slate-400">
                No notifications yet.
              </p>
            ) : (
              <div className="space-y-3">
                {userNotifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg text-sm ${
                      !n.read
                        ? "bg-brand-accent/5 text-brand-navy"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {n.message}
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------- STAT CARD ---------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border p-5 ${
        highlight
          ? "bg-brand-navy text-white border-transparent"
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`size-9 rounded-lg grid place-items-center mb-3 ${
          highlight
            ? "bg-white/10"
            : "bg-brand-accent/10 text-brand-accent"
        }`}
      >
        <Icon className="size-4" />
      </div>

      <div className="text-3xl font-bold tracking-tight">
        <AnimatedCounter value={value} />
      </div>

      <div
        className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${
          highlight ? "text-white/60" : "text-slate-400"
        }`}
      >
        {label}
      </div>
    </motion.div>
  );
}

/* ---------------- STATUS PILL ---------------- */

export function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    Paid: "bg-blue-50 text-blue-700",
    Preparing: "bg-amber-50 text-amber-700",
    Ready: "bg-green-50 text-green-700",
    Collected: "bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-tight ${
        palette[status] ?? "bg-slate-100"
      }`}
    >
      {status}
    </span>
  );
}