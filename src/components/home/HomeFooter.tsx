import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Mail, MapPin } from "lucide-react";

import { Logo } from "../Logo";

const linkClass =
  "group inline-flex items-start gap-1.5 rounded-sm text-sm leading-6 text-white/65 transition-colors duration-200 hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy";

const arrowClass =
  "mt-1.5 size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100";

const headingClass = "text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45";

export function HomeFooter() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-brand-navy text-white">
      {/* Accent glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 size-80 rounded-full bg-brand-gold/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-brand-accent/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/3 size-64 rounded-full bg-brand-blue/10 blur-3xl"
      />

      {/* Subtle circuit pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-white opacity-[0.055] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
      >
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="home-footer-circuit" width="88" height="88" patternUnits="userSpaceOnUse">
              <path
                d="M0 22h20m12 0h20M52 22h36M44 0v10m0 18v24m0 12v24M22 44H0m52 0h36M66 44v18m0 12v14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <circle cx="32" cy="22" r="2.5" fill="currentColor" />
              <circle cx="52" cy="22" r="2.5" fill="currentColor" />
              <circle cx="44" cy="44" r="2.5" fill="currentColor" />
              <circle cx="66" cy="44" r="2.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#home-footer-circuit)" />
        </svg>
      </div>

      {/* Top hairline */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-16 sm:pt-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.65fr_0.9fr_1.15fr_1.1fr] lg:gap-8 xl:gap-12">
          {/* Brand */}
          <div>
            <Link
              to="/"
              aria-label="EU Hardwarestore home"
              className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-lg shadow-black/20 ring-1 ring-white/20">
                <Logo />
              </span>
              <span className="flex flex-col">
                <span className="text-lg font-bold leading-tight tracking-tight text-white">
                  <span className="text-brand-gold">EU</span> Hardwarestore
                </span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/50">
                  Elizade University
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              The official engineering hardware hub for Elizade University students. Browse lab
              components, pay securely, and collect them on campus.
            </p>

            <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-gold" />
              Innovation · Learning · Excellence
            </p>

            <p className="mt-6 max-w-sm border-t border-white/10 pt-5 text-[11px] leading-relaxed text-white/40">
              Official hardware hub · Department of Electrical &amp; Electronics Engineering
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Quick links">
            <h2 className={headingClass}>Quick Links</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <Link to="/" className={linkClass}>
                  Home
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/components" className={linkClass}>
                  Shop
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="about" className={linkClass}>
                  About
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="policies" className={linkClass}>
                  Policies
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="contact" className={linkClass}>
                  Contact
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>

          {/* Customer policies */}
          <nav aria-label="Customer policies">
            <h2 className={headingClass}>Customer Policies</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <Link to="/" hash="policy-terms" className={linkClass}>
                  Terms &amp; Conditions
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="policy-privacy" className={linkClass}>
                  Privacy Policy
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="policy-refunds" className={linkClass}>
                  Refund &amp; Cancellation
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="policy-pickup" className={linkClass}>
                  Delivery &amp; Campus Pickup
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/" hash="policy-payment" className={linkClass}>
                  Payment Information
                  <ArrowUpRight className={arrowClass} aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className={headingClass}>Contact</h2>
            <address className="mt-5 space-y-5 not-italic">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-brand-gold">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm leading-relaxed text-white/60">
                  Elizade University, Ilara Mokin, Ondo State, Nigeria
                </p>
              </div>

              <a
                href="mailto:euhardwarestore@gmail.com"
                className="group flex items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-brand-gold transition-colors duration-200 group-hover:border-brand-gold/30 group-hover:bg-brand-gold/10">
                  <Mail className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    Email support
                  </span>
                  <span className="mt-1 flex items-start gap-1 break-all text-sm text-white/65 transition-colors duration-200 group-hover:text-brand-gold">
                    euhardwarestore@gmail.com
                    <ArrowUpRight
                      className="mt-1 size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </a>
            </address>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-white/45 sm:text-sm">
              © {new Date().getFullYear()} EU Hardwarestore · Elizade University. All rights
              reserved.
            </p>

            <div className="flex items-center gap-5">
              <Link
                to="/"
                hash="policy-terms"
                className="rounded-sm text-xs font-medium text-white/50 transition-colors duration-200 hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:text-sm"
              >
                Terms
              </Link>
              <span aria-hidden="true" className="h-3 w-px bg-white/15" />
              <Link
                to="/"
                hash="policy-privacy"
                className="rounded-sm text-xs font-medium text-white/50 transition-colors duration-200 hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:text-sm"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
