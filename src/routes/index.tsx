import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingCart, CreditCard, Package, CheckCircle2 } from "lucide-react";
import { NavAppShell } from "@/components/NavAppShell";
import { ComponentCard } from "@/components/ComponentCard";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Reveal } from "@/components/Section";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EU Hardwarestore — Elizade University Hardware Hub" },
      { name: "description", content: "Order microcontrollers, sensors and lab components online and pick them up on Elizade University campus." },
      { property: "og:title", content: "EU Hardwarestore — Elizade University Hardware Hub" },
      { property: "og:description", content: "Order microcontrollers, sensors and lab components online and pick them up on campus." },
    ],
  }),
  component: Index,
});

const STEPS = [
  { icon: ShoppingCart, title: "Browse the catalog", body: "Search and filter the EU lab's live inventory of sensors, MCUs, and prototyping gear." },
  { icon: CreditCard, title: "Pay online", body: "Checkout securely. We tie your order to your matric number — no QR code needed." },
  { icon: Package, title: "We prepare it", body: "Lab admins verify and package your items the moment payment lands." },
  { icon: CheckCircle2, title: "Pick up on campus", body: "Walk into the lab, give your Order ID, and collect your parts." },
];

const TESTIMONIALS = [
  { name: "Tomi A.", role: "400L · Mechatronics", quote: "Used to spend a full day in Lagos sourcing parts. Now my project never stalls." },
  { name: "Chinwe O.", role: "300L · EEE", quote: "The stock is honest. If it says 12 left, there are 12 left when I arrive." },
  { name: "Femi B.", role: "200L · Computer Eng.", quote: "Picked up an ESP32 between lectures. Fastest thing on campus." },
];

function Index() {
const components = useStore((s) => s.components);
const users = useStore((s) => s.users);
const orders = useStore((s) => s.orders);

// now compute safely
const featured = components.slice(0, 6);

const totalOrders = orders.length;

const totalStock = components.reduce((a, c) => a + c.stock, 0);

const totalStudents = users.filter((u) => u.role === "student").length;

  return (
    <NavAppShell>
      <header className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-circuit [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="absolute top-20 -left-20 size-72 rounded-full bg-brand-accent/10 blur-3xl animate-float-soft" />
        <div className="absolute top-40 -right-20 size-96 rounded-full bg-brand-gold/10 blur-3xl animate-float-soft" />

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-brand-gold/5 px-3 py-1 text-xs font-semibold text-brand-gold mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-gold" />
            </span>
            ELIZADE UNIVERSITY · OFFICIAL HARDWARE HUB
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
            className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-slate-900 md:text-7xl"
          >
            Engineering the <span className="text-brand-accent">Future</span> of Campus Innovation.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-600"
          >
            The official inventory system for EU students. Order microcontrollers, sensors and mechanical parts for your projects and pick them up at the lab.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link to="/components" className="group relative flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-navy px-8 font-semibold text-white transition-all hover:shadow-xl hover:shadow-brand-navy/20 active:scale-95">
              Browse Inventory
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="h-12 inline-flex items-center rounded-lg border border-slate-200 bg-white px-8 font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300">
              How it Works
            </a>
          </motion.div>
        </div>
      </header>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6 -mt-12">
        <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Stat label="Orders Fulfilled" value={totalOrders + 1248} />
          <Stat label="Components in Stock" value={totalStock} />
          <Stat label="Students Served" value={totalStudents + 840} />
          <Stat label="Avg Pickup" value={12} suffix=" min" />
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-24">
        <Reveal className="text-center mb-14">
          <h2 className="text-4xl font-bold text-brand-navy">How it works</h2>
          <p className="mt-3 text-slate-500">From browse to bench in four clean steps.</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="size-11 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-4">
                  <s.icon className="size-5" />
                </div>
                <div className="font-mono text-[10px] tracking-widest text-slate-400 mb-1">STEP 0{i + 1}</div>
                <h3 className="text-lg font-bold text-brand-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <Reveal className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-brand-navy">Featured Components</h2>
            <p className="mt-2 text-slate-500">Available for immediate laboratory collection.</p>
          </div>
          <Link to="/components" className="hidden md:inline-flex items-center gap-2 text-brand-accent font-semibold text-sm hover:gap-3 transition-all">
            View all <ArrowRight className="size-4" />
          </Link>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c, i) => <ComponentCard key={c.id} c={c} index={i} />)}
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="bg-brand-navy py-24 text-white mt-16">
        <div className="mx-auto max-w-7xl px-6 grid gap-16 lg:grid-cols-2">
          <Reveal className="flex flex-col justify-center">
            <h2 className="text-4xl font-bold">Real-time Lab Logistics</h2>
            <p className="mt-6 text-slate-400">
              Monitor your orders from confirmation to collection. Our admin team verifies every component before pickup so your project never stalls.
            </p>
            <div className="mt-12 space-y-6">
              {[
                ["Instant Payment Verification", "Automated confirmation linked to your matric number."],
                ["Smart Stock Management", "Admins receive low-stock alerts to keep essentials in stock."],
                ["Order-ID Pickup", "Just walk in with your Order ID — no QR code scanning."],
              ].map(([title, body]) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="mt-0.5 rounded bg-white/10 p-1.5"><CheckCircle2 className="size-4 text-brand-gold" /></div>
                  <div>
                    <h4 className="font-bold">{title}</h4>
                    <p className="text-sm text-slate-400">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="relative rounded-2xl bg-slate-900 p-8 shadow-2xl ring-1 ring-white/10">
            <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
              <span className="font-mono text-xs tracking-widest text-slate-500 uppercase">Admin Dashboard View</span>
              <div className="flex gap-2">
                <div className="size-2 rounded-full bg-red-500" />
                <div className="size-2 rounded-full bg-amber-500" />
                <div className="size-2 rounded-full bg-green-500" />
              </div>
            </div>
            <div className="space-y-4">
              <FakeOrder name="John O." initials="JO" items="Arduino R3 x2, LED Pack x1" status="PREPARING" color="amber" />
              <FakeOrder name="Sarah A." initials="SA" items="Ultrasonic Sensor x5" status="READY" color="green" />
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/5 bg-white/5 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-tight">Total Orders</p>
                  <p className="mt-1 text-2xl font-bold"><AnimatedCounter value={1248} /></p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-tight">Pending Pickups</p>
                  <p className="mt-1 text-2xl font-bold text-brand-gold"><AnimatedCounter value={14} /></p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal className="text-center mb-12">
          <h2 className="text-3xl font-bold text-brand-navy">Loved by EU engineers</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-brand-navy leading-relaxed">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="size-9 rounded-full bg-brand-navy text-white text-xs font-bold grid place-items-center">
                    {t.name.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-brand-navy">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </NavAppShell>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-brand-navy tracking-tight">
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function FakeOrder({ name, initials, items, status, color }: { name: string; initials: string; items: string; status: string; color: "amber" | "green" }) {
  const palette = color === "amber"
    ? "bg-amber-500/10 text-amber-500"
    : "bg-green-500/10 text-green-500";
  const avatar = color === "amber" ? "bg-brand-accent/20 text-brand-accent" : "bg-brand-gold/20 text-brand-gold";
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
      <div className="flex items-center gap-4">
        <div className={`size-10 rounded-full grid place-items-center text-xs font-bold ${avatar}`}>{initials}</div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-slate-500">{items}</p>
        </div>
      </div>
      <span className={`rounded px-2 py-1 text-[10px] font-bold ${palette}`}>{status}</span>
    </div>
  );
}
