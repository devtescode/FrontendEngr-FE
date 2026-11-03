import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type PolicyItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  content: ReactNode;
};

export function PolicyAccordion({
  policy,
  open,
  onToggle,
}: {
  policy: PolicyItem;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = policy.icon;
  const triggerId = `${policy.id}-trigger`;
  const panelId = `${policy.id}-panel`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
        open
          ? "border-brand-gold/30 shadow-lg shadow-brand-gold/5"
          : "border-slate-200 shadow-sm hover:border-slate-300"
      }`}
    >
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 md:p-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            aria-hidden="true"
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
              open
                ? "bg-brand-gold text-white shadow-sm shadow-brand-gold/25"
                : "bg-brand-accent/10 text-brand-accent"
            }`}
          >
            <Icon className="size-5" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-brand-navy md:text-lg">
              {policy.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{open ? "Close" : "Read policy"}</p>
          </div>
        </div>

        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            open ? "bg-brand-gold/10 text-brand-gold" : "bg-slate-100 text-slate-500"
          }`}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={panelId}
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 pb-6 pt-5 text-sm leading-7 text-slate-600 md:px-6">
              {policy.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
