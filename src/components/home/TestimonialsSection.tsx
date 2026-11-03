import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Quote } from "lucide-react";

type Testimonial = {
  name: string;
  initials: string;
  department: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Tomi A.",
    initials: "TA",
    department: "400L · Mechatronics",
    quote: "Used to spend a full day in Lagos sourcing parts. Now my project never stalls.",
  },
  {
    name: "Chinwe O.",
    initials: "CO",
    department: "300L · EEE",
    quote: "The stock is honest. If it says 12 left, there are 12 left when I arrive.",
  },
  {
    name: "Femi B.",
    initials: "FB",
    department: "200L · Computer Eng.",
    quote: "Picked up an ESP32 between lectures. Fastest thing on campus.",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

export function TestimonialsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="testimonials" className="relative overflow-hidden bg-white py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-brand-gold/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-8 size-80 rounded-full bg-brand-accent/[0.06] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-80px" }}
          variants={headerVariants}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/[0.07] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-brand-gold">
            <span className="size-1.5 rounded-full bg-brand-gold" />
            STUDENT FEEDBACK
          </span>

          <h2 className="mt-5 font-display text-4xl leading-[1.05] tracking-wide text-brand-navy sm:text-5xl">
            What Our Students Say
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
            Words from engineering students who source their project parts from the lab shelf,
            between lectures and late-night builds.
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
          className="mt-12 grid gap-6 md:grid-cols-3 md:gap-7"
        >
          {TESTIMONIALS.map((testimonial) => (
            <motion.figure
              key={testimonial.name}
              variants={cardVariants}
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_50px_-34px_rgba(15,23,42,0.4)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_26px_60px_-30px_rgba(15,23,42,0.45)] sm:p-8"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent"
              />

              <div className="grid size-11 place-items-center rounded-2xl border border-brand-gold/20 bg-brand-gold/10 text-brand-gold">
                <Quote className="size-5" aria-hidden="true" />
              </div>

              <blockquote className="mt-6 flex-1 text-lg font-medium leading-8 text-slate-700 sm:text-xl sm:leading-9">
                “{testimonial.quote}”
              </blockquote>

              <figcaption className="mt-7 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-3.5">
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-navy font-mono text-xs font-bold tracking-[0.08em] text-brand-gold ring-1 ring-brand-gold/30"
                  >
                    {testimonial.initials}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy">
                      {testimonial.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium tracking-wide text-slate-500">
                      {testimonial.department}
                    </p>
                  </div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
