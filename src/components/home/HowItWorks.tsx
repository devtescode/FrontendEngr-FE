import { motion, useReducedMotion } from "framer-motion";
import { PackageCheck, Search, ShieldCheck, ShoppingCart, type LucideIcon } from "lucide-react";

type Step = {
  title: string;
  body: string;
  icon: LucideIcon;
};

const STEPS: readonly Step[] = [
  {
    title: "Browse",
    body: "Explore live inventory, compare parts, and check real stock counts.",
    icon: Search,
  },
  {
    title: "Order",
    body: "Add components to your cart and check out with your matric number.",
    icon: ShoppingCart,
  },
  {
    title: "Pay",
    body: "Complete payment securely through Paystack; your order is verified automatically.",
    icon: ShieldCheck,
  },
  {
    title: "Pick up",
    body: "Collect at the campus lab with your Order ID — no QR code needed.",
    icon: PackageCheck,
  },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="about"
      className="relative overflow-hidden border-y border-slate-200/70 bg-slate-50 py-20 md:py-28"
    >
      {/* Soft ambient lighting keeps the light section from feeling flat. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-16 size-72 rounded-full bg-brand-gold/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 bottom-0 size-80 rounded-full bg-brand-accent/10 blur-3xl"
      />

      <div id="how" className="relative mx-auto w-full max-w-7xl scroll-mt-24 px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
            className="lg:col-span-7"
          >
            <p className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
              <span
                aria-hidden="true"
                className="h-px w-10 bg-gradient-to-r from-brand-gold to-brand-gold/20"
              />
              HOW IT WORKS
            </p>

            <h2 className="mt-5 max-w-2xl font-display text-4xl leading-[0.95] tracking-[0.01em] text-brand-navy sm:text-5xl md:text-6xl">
              From browse to bench in four clean steps.
            </h2>
          </motion.div>

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.5,
              delay: reduceMotion ? 0 : 0.1,
              ease: "easeOut",
            }}
            className="lg:col-span-5 lg:pb-2"
          >
            <p className="text-base leading-7 text-slate-600 md:text-lg">
              Every order follows the official Elizade University lab flow — live inventory, a
              secure Paystack payment, and a verified pickup handled by the campus hardware team.
            </p>
          </motion.div>
        </div>

        <div className="relative mt-14 md:mt-16">
          {/* Desktop-only dashed connector, sitting behind the icon tiles. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-14 hidden lg:block"
          >
            <div className="absolute inset-x-[12.5%] top-0 border-t border-dashed border-slate-300/90" />
            {["left-1/4", "left-1/2", "left-3/4"].map((position) => (
              <span
                key={position}
                className={`absolute top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-brand-gold/60 bg-slate-50 ${position}`}
              />
            ))}
          </div>

          <div className="relative grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.45,
                    delay: reduceMotion ? 0 : index * 0.08,
                    ease: "easeOut",
                  }}
                  className="h-full"
                >
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-brand-accent/30 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] sm:p-7">
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-brand-gold shadow-lg shadow-brand-navy/15 transition-colors duration-300 group-hover:bg-brand-blue group-hover:text-white">
                        <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                      </div>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.22em] text-slate-500 transition-colors duration-300 group-hover:border-brand-gold/30 group-hover:text-brand-gold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3 className="mt-6 font-display text-2xl tracking-wide text-brand-navy">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                  </article>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
