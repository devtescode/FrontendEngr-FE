import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, ShieldCheck, Sparkles, Wifi } from "lucide-react";

import { HeroVisual } from "./HeroVisual";

const TRUST_POINTS = [
  {
    icon: Wifi,
    title: "Real-time stock",
    body: "Counts synced from the lab",
  },
  {
    icon: ShieldCheck,
    title: "Secure payment",
    body: "Verified through Paystack",
  },
  {
    icon: MapPin,
    title: "Campus pickup",
    body: "Collect at the EU lab",
  },
];

export function HeroSection() {
  return (
    <section id="home" className="hero-mesh relative isolate overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-circuit-dark opacity-45 [mask-image:linear-gradient(to_bottom,black_5%,transparent_88%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-16 size-80 rounded-full bg-brand-accent/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-brand-gold/15 blur-[110px]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-28 pt-14 sm:px-6 sm:pt-16 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10 lg:pb-36 lg:pt-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-gold backdrop-blur-sm sm:text-[11px]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-gold opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-brand-gold" />
            </span>
            Elizade University Official Hardware Hub
          </div>

          <h1 className="mt-6 font-display text-[3.4rem] leading-[0.92] tracking-[0.01em] sm:text-6xl lg:text-[5.2rem]">
            Your One-Stop <span className="text-gold-gradient block">Hardware Store</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            The official inventory system for Elizade University engineering students. Order
            microcontrollers, sensors, and mechanical parts for your projects pay securely, then
            pick them up at the lab.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/components"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-gold px-6 text-sm font-bold text-brand-navy shadow-lg shadow-brand-gold/20 transition hover:bg-[#e88a0a] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy active:scale-[0.99]"
            >
              Browse Inventory
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#how"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
            >
              How It Works
              {/* <Sparkles className="size-4 text-brand-gold" /> */}
            </a>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-brand-gold">
                  <point.icon className="size-3.5" />
                </span>
                <div>
                  <dt className="text-xs font-semibold text-white">{point.title}</dt>
                  <dd className="mt-0.5 text-[11px] leading-4 text-slate-400">{point.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute inset-6 rounded-[2.5rem] bg-brand-accent/15 blur-3xl"
          />
          <HeroVisual className="relative z-10" />

          <div className="absolute left-0 top-4 z-20 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 shadow-2xl backdrop-blur-md sm:left-2">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-gold">
              EU Lab Inventory
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white">
              <span className="size-1.5 rounded-full bg-brand-gold" />
              Live stock counts
            </p>
          </div>

          <div className="absolute bottom-5 right-0 z-20 rounded-2xl border border-white/10 bg-slate-900/85 px-4 py-3 shadow-2xl backdrop-blur-md sm:right-2">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Collection
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white">
              <MapPin className="size-3.5 text-brand-gold" />
              Order ID at the lab
            </p>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent"
      />
    </section>
  );
}
