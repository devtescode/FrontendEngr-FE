import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Menu, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

export function HomePageNavbar() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname ?? "",
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  if (typeof pathname !== "string") return null;
  if (pathname.startsWith("/admin")) return null;

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <>
      {/* MOBILE BACKDROP */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 top-16 z-40 bg-slate-950/30 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* LOGO */}
          <Link to="/" onClick={closeMobileMenu} className="shrink-0">
            <Logo />
          </Link>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* SIGN UP — secondary (desktop only) */}
            <Link
              to="/register"
              className="group hidden h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-brand-navy transition-all duration-200 hover:border-brand-navy/30 hover:bg-slate-50 active:scale-[0.97] sm:flex"
            >
              <UserPlus className="size-4 text-brand-navy/70 transition-colors group-hover:text-brand-navy" />
              <span>Sign up</span>
            </Link>

            {/* LOGIN — primary CTA */}
            <Link
              to="/login"
              className="group relative hidden h-10 items-center gap-2 overflow-hidden rounded-full bg-brand-navy px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-navy/25 active:scale-[0.97] sm:flex"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <LogIn className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Login</span>
            </Link>

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100 md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="size-5 text-brand-navy" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="size-5 text-brand-navy" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 top-full z-50 border-t border-slate-200 bg-white shadow-xl md:hidden"
            >
              <div className="flex flex-col gap-2 px-4 py-4 sm:px-6">
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand-navy active:scale-[0.98]"
                >
                  <UserPlus className="size-4 text-brand-navy/70" />
                  Sign up
                </Link>

                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white active:scale-[0.98]"
                >
                  <LogIn className="size-4" />
                  Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}