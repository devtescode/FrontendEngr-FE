import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  LogIn,
  Mail,
  MapPin,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ElementType, FormEvent, ReactNode } from "react";

import { Logo } from "./Logo";

const POLICY_LINKS = [
  { label: "Terms & Conditions", hash: "policy-terms", icon: FileText },
  { label: "Privacy Policy", hash: "policy-privacy", icon: ShieldCheck },
  { label: "Refund & Cancellation", hash: "policy-refunds", icon: RotateCcw },
  { label: "Delivery & Pickup", hash: "policy-pickup", icon: MapPin },
  { label: "Payment Information", hash: "policy-payment", icon: CreditCard },
];

const NAV_LINKS = [
  { label: "Home", to: "/" as const, match: (pathname: string) => pathname === "/" },
  {
    label: "Shop",
    to: "/components" as const,
    match: (pathname: string) => pathname.startsWith("/components"),
  },
  { label: "About", to: "/" as const, hash: "about" },
  { label: "Contact", to: "/" as const, hash: "contact" },
];

export function HomePageNavbar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname ?? "",
  });
  const hash = useRouterState({
    select: (state) => state.location.hash ?? "",
  });
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const policiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen && !policiesOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setPoliciesOpen(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (policiesRef.current?.contains(event.target as Node)) return;
      setPoliciesOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [mobileOpen, policiesOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  if (typeof pathname !== "string") return null;
  if (pathname.startsWith("/admin")) return null;

  const closeMenus = () => {
    setMobileOpen(false);
    setPoliciesOpen(false);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();

    closeMenus();
    navigate({
      to: "/components",
      search: nextQuery ? { q: nextQuery } : {},
    });
  };

  const isPoliciesActive = pathname === "/" && hash.startsWith("#policy");

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-white/10 bg-brand-navy">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-3 px-4 text-[10px] font-medium tracking-wide text-slate-300 sm:px-6 sm:text-[11px]">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0 text-brand-gold" />
            <span className="truncate">Elizade University · Ilara Mokin, Ondo State</span>
          </p>
          <a
            href="mailto:support@euhardwarestore.ng"
            className="hidden items-center gap-1.5 transition hover:text-white sm:flex"
          >
            <Mail className="size-3 text-brand-gold" />
            support@euhardwarestore.ng
          </a>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenus}
            className="fixed inset-0 top-24 z-10 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={reduceMotion ? false : { y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
        aria-label="Main navigation"
        className="relative z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            aria-label="EU Hardwarestore home"
          >
            <span className="grid size-9 place-items-center overflow-hidden rounded-lg bg-brand-navy ring-1 ring-brand-navy/10">
              <Logo />
            </span>
            <span className="hidden flex-col leading-none min-[380px]:flex">
              <span className="font-display text-xl tracking-[0.06em] text-brand-navy">
                EU HARDWARE<span className="text-brand-gold">STORE</span>
              </span>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Elizade University
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.slice(0, 3).map((item) => (
              <Link
                key={item.label}
                to={item.to}
                hash={item.hash}
                className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
                  item.match?.(pathname)
                    ? "text-brand-navy"
                    : "text-slate-500 hover:bg-slate-100 hover:text-brand-navy"
                }`}
              >
                {item.label}
                {item.match?.(pathname) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-gold"
                  />
                )}
              </Link>
            ))}

            <div ref={policiesRef} className="relative">
              <button
                type="button"
                onClick={() => setPoliciesOpen((open) => !open)}
                aria-expanded={policiesOpen}
                aria-controls="policies-menu"
                aria-haspopup="true"
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${
                  isPoliciesActive
                    ? "text-brand-navy"
                    : "text-slate-500 hover:bg-slate-100 hover:text-brand-navy"
                }`}
              >
                Policies
                <ChevronDown
                  className={`size-3.5 transition-transform ${policiesOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {policiesOpen && (
                  <motion.div
                    id="policies-menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                  >
                    {POLICY_LINKS.map((policy) => (
                      <Link
                        key={policy.hash}
                        to="/"
                        hash={policy.hash}
                        onClick={closeMenus}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
                      >
                        <policy.icon className="size-4 text-brand-accent" />
                        {policy.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/"
              hash="contact"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
            >
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} role="search" className="hidden xl:block">
              <label className="relative block">
                <span className="sr-only">Search components</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search parts…"
                  className="h-10 w-44 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-accent/40 focus:bg-white focus:ring-2 focus:ring-brand-accent/20"
                />
              </label>
            </form>

            <Link
              to="/register"
              className="hidden h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-brand-navy transition hover:border-brand-navy/25 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 lg:inline-flex"
            >
              <UserPlus className="size-4 text-brand-navy/70" />
              Sign up
            </Link>

            <Link
              to="/login"
              className="hidden h-10 items-center gap-1.5 rounded-full bg-brand-navy px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy/90 hover:shadow-lg hover:shadow-brand-navy/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 lg:inline-flex"
            >
              <LogIn className="size-4" />
              Login
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="grid size-10 place-items-center rounded-full text-brand-navy transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 lg:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="size-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="size-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              id="mobile-navigation"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className="absolute inset-x-0 top-full z-50 flex max-h-[calc(100dvh-6rem)] flex-col border-t border-slate-200 bg-white shadow-2xl lg:hidden"
            >
              <div className="mx-auto flex w-full max-w-7xl flex-col overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6">
                <div className="grid gap-1">
                  <MobileLink to="/" icon={Home} onClick={closeMenus}>
                    Home
                  </MobileLink>
                  <MobileLink to="/components" icon={ShoppingBag} onClick={closeMenus}>
                    Shop
                  </MobileLink>
                  <MobileLink to="/" hash="about" icon={FileText} onClick={closeMenus}>
                    About
                  </MobileLink>
                  <MobileLink to="/" hash="contact" icon={Mail} onClick={closeMenus}>
                    Contact
                  </MobileLink>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                  <Link
                    to="/register"
                    onClick={closeMenus}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-brand-navy active:scale-[0.98]"
                  >
                    <UserPlus className="size-4" />
                    Sign up
                  </Link>
                  <Link
                    to="/login"
                    onClick={closeMenus}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white active:scale-[0.98]"
                  >
                    <LogIn className="size-4" />
                    Login
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}

function MobileLink({
  to,
  hash,
  icon: Icon,
  onClick,
  children,
}: {
  to: "/" | "/components";
  hash?: string;
  icon: ElementType;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-brand-navy"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-brand-accent/10 text-brand-accent">
        <Icon className="size-4" />
      </span>
      {children}
    </Link>
  );
}
