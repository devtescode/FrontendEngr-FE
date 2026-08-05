import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LayoutDashboard, Boxes, ClipboardList, Hand, LogOut } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — PulseLab" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/admin/login") return <Outlet />;

  return (
    // <RequireAuth role="admin">
      <AdminShell />
    // </RequireAuth>
  );
}

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/components", label: "Inventory", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/pickup", label: "Pickup", icon: Hand },
];

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  if (pathname === "/admin") return <AdminLayoutShell><AdminOverview /></AdminLayoutShell>;

  return (
    <AdminLayoutShell><Outlet /></AdminLayoutShell>
  );

 function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-900 text-white overflow-hidden">

      {/* Mobile Overlay */}
     {open && (
  <div
    onClick={() => setOpen(false)}
    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
  />
)}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static z-50 top-0 left-0 min-h-screen
          w-64 border-r border-white/5 bg-slate-950 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-6 border-b border-white/5">
          <Logo className="text-white" />
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-2">
            Admin Console
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = n.exact
              ? pathname === n.to
              : pathname.startsWith(n.to);

            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${
                    active
                      ? "bg-brand-accent/15 text-brand-accent"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => {
              logout();
              navigate({ to: "/admin/login" });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>


      {/* Main Content */}
      <main
        className={`
          flex-1 overflow-auto
          transition-all duration-300
          ${open ? "blur-sm lg:blur-none" : ""}
        `}
      >

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/5 bg-slate-950">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <span className="font-semibold">
            Admin Console
          </span>
        </div>

        {children}

      </main>

    </div>
  );
}
}

function AdminOverview() {
  const orders = useStore((s) => s.orders);
  const components = useStore((s) => s.components);
  const revenue = orders.filter((o) => o.status !== "Collected" ? true : true).reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "Paid" || o.status === "Preparing").length;
  const ready = orders.filter((o) => o.status === "Ready").length;
  const lowStock = components.filter((c) => c.stock < 10).length;

  return (
    <div className="p-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Elizade University · Hardware Hub</p>
        <h1 className="text-4xl font-bold text-white mt-1">Operations Overview</h1>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <AdminStat label="Total Orders" value={orders.length} />
        <AdminStat label="Pending" value={pending} accent="amber" />
        <AdminStat label="Ready for Pickup" value={ready} accent="green" />
        <AdminStat label="Revenue" value={`₦${revenue.toLocaleString()}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-slate-950 border border-white/5 p-6">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-4">Latest Orders</h3>
          {orders.length === 0
            ? <p className="text-slate-500 text-sm py-8 text-center">No orders yet.</p>
            : (
              <div className="space-y-2">
                {orders.slice(0, 6).map((o) => (
                  <Link key={o.id} to="/admin/orders" className="block">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 hover:bg-white/10 p-4 transition-colors">
                      <div>
                        <div className="text-sm font-medium">#{o.id} · {o.userName}</div>
                        <div className="text-xs text-slate-500">{o.items.length} items · ₦{o.total.toLocaleString()}</div>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-brand-gold">{o.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>

        <div className="rounded-2xl bg-slate-950 border border-white/5 p-6">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-4">Low Stock Alerts</h3>
          <div className="text-5xl font-bold text-brand-gold mb-1">{lowStock}</div>
          <p className="text-sm text-slate-500">component{lowStock !== 1 && "s"} below threshold</p>
          <Link to="/admin/components" className="mt-6 block text-center w-full rounded-lg bg-brand-accent text-white py-2.5 text-sm font-semibold hover:bg-blue-600">Manage inventory</Link>
        </div>
      </div>
    </div>
  );
}

function AdminStat({ label, value, accent }: { label: string; value: number | string; accent?: "amber" | "green" }) {
  const color = accent === "amber" ? "text-amber-400" : accent === "green" ? "text-green-400" : "text-white";
  return (
    <div className="rounded-2xl bg-slate-950 border border-white/5 p-5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}