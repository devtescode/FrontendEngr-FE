import { Link } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, MapPin, Radio, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";

const TRUST_POINTS = [
  { icon: Radio, label: "Live lab stock" },
  { icon: LockKeyhole, label: "Secure Paystack checkout" },
  { icon: MapPin, label: "Campus pickup with order ID" },
];

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-24 size-96 rounded-full bg-brand-accent/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-0 size-80 rounded-full bg-brand-gold/10 blur-3xl"
      />

      <div className="relative grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <aside className="relative hidden overflow-hidden bg-brand-navy px-10 py-10 text-white lg:flex lg:flex-col xl:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-circuit-dark opacity-40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-20 size-80 rounded-full bg-brand-accent/20 blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 bottom-16 size-80 rounded-full bg-brand-gold/15 blur-[110px]"
          />

          <div className="relative z-10 flex items-center justify-between gap-6">
            <Link
              to="/"
              aria-label="EU Hardwarestore home"
              className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
            >
              <span className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-lg shadow-black/20 ring-1 ring-white/20">
                <Logo />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-2xl tracking-[0.06em]">
                  EU HARDWARE<span className="text-brand-gold">STORE</span>
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Elizade University
                </span>
              </span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <ShieldCheck className="size-3.5" />
              Student access
            </span>
          </div>

          <div className="relative z-10 my-auto max-w-lg py-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">
              <span className="size-1.5 rounded-full bg-brand-gold" />
              The lab shelf, online
            </p>

            <h2 className="mt-6 font-display text-5xl leading-[0.94] tracking-[0.01em] text-white xl:text-6xl">
              Build more.
              <span className="text-gold-gradient block">Source less.</span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Order microcontrollers, sensors and project parts from the Elizade University lab —
              with stock you can trust and pickup on campus.
            </p>

            <ul className="mt-9 space-y-4">
              {TRUST_POINTS.map((point) => (
                <li key={point.label} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-brand-gold">
                    <point.icon className="size-4" aria-hidden="true" />
                  </span>
                  {point.label}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-[11px] leading-relaxed text-white/35">
            Elizade University · Ilara Mokin, Ondo State, Nigeria
          </p>
        </aside>

        <main className="relative flex min-h-screen flex-col">
          <header className="bg-brand-navy px-4 py-4 text-white sm:px-6 lg:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between gap-4">
              <Link
                to="/"
                aria-label="EU Hardwarestore home"
                className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
              >
                <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5">
                  <Logo />
                </span>
                <span className="font-display text-xl tracking-[0.06em]">
                  EU HARDWARE<span className="text-brand-gold">STORE</span>
                </span>
              </Link>

              <Link
                to="/"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Store
              </Link>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
            <div className="w-full max-w-md">
              <Link
                to="/"
                className="mb-6 hidden items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 lg:inline-flex"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to store
              </Link>

              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-accent">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-display text-4xl leading-[0.96] tracking-[0.01em] text-brand-navy sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">{description}</p>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-premium sm:p-8">
                {children}
              </div>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
                <LockKeyhole className="size-3.5" aria-hidden="true" />
                Student accounts are secured with verified email access.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
