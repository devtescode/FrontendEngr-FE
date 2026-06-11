import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ComponentCard } from "@/components/ComponentCard";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/data";

export const Route = createFileRoute("/components")({
  head: () => ({ meta: [{ title: "Components — PulseLab" }] }),
  component: ComponentsLayout,
});

function ComponentsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // If on a child route (/components/$id), render only the outlet
  if (pathname !== "/components") return <Outlet />;
  return <CatalogIndex />;
}

const CATEGORIES: (Category | "All")[] = ["All", "Microcontroller", "Sensors", "Prototyping", "Passive", "Power", "Connector"];
const SORTS = [
  { id: "popular", label: "Most stocked" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
] as const;

function CatalogIndex() {
  const components = useStore((s) => s.components);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("popular");

  const filtered = useMemo(() => {
    let r = components.filter((c) =>
      (cat === "All" || c.category === cat) &&
      (q.trim() === "" || (c.name + " " + c.description + " " + c.sku).toLowerCase().includes(q.toLowerCase())),
    );
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "popular") r = [...r].sort((a, b) => b.stock - a.stock);
    return r;
  }, [components, q, cat, sort]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-brand-navy">Component Catalog</h1>
          <p className="text-slate-500 mt-2">{filtered.length} item{filtered.length !== 1 && "s"} available.</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search components, SKUs..."
            className="flex-1 h-11 px-4 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-11 px-3 rounded-lg border border-slate-200 bg-white">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${cat === c ? "bg-brand-navy text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}
            >{c}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No components match your filters.</div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => <ComponentCard key={c.id} c={c} index={i} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}