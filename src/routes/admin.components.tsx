import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Category, Component } from "@/lib/data";

export const Route = createFileRoute("/admin/components")({
  head: () => ({ meta: [{ title: "Inventory — Admin" }] }),
  component: AdminComponents,
});

const CATS: Category[] = ["Microcontroller", "Sensors", "Prototyping", "Passive", "Power", "Connector"];

function AdminComponents() {
  const components = useStore((s) => s.components);
  const addComponent = useStore((s) => s.addComponent);
  const updateComponent = useStore((s) => s.updateComponent);
  const deleteComponent = useStore((s) => s.deleteComponent);
  const [editing, setEditing] = useState<Component | "new" | null>(null);

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">{components.length} components in stock.</p>
        </div>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-lg bg-brand-accent text-white px-5 py-2.5 font-semibold hover:bg-blue-600">
          <Plus className="size-4" /> Add component
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-950 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th className="text-left px-5 py-3">Component</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">SKU</th>
              <th className="text-right px-5 py-3">Price</th>
              <th className="text-right px-5 py-3">Stock</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-5 py-3"><span className="text-2xl mr-2">{c.emoji}</span><span className="font-medium">{c.name}</span></td>
                <td className="px-5 py-3 text-slate-400">{c.category}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.sku}</td>
                <td className="px-5 py-3 text-right">₦{c.price.toLocaleString()}</td>
                <td className={`px-5 py-3 text-right font-semibold ${c.stock < 10 ? "text-amber-400" : ""}`}>{c.stock}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => setEditing(c)} className="size-8 rounded hover:bg-white/5 inline-grid place-items-center text-slate-400 hover:text-white mr-1"><Pencil className="size-4" /></button>
                  <button onClick={() => confirm(`Delete ${c.name}?`) && deleteComponent(c.id)} className="size-8 rounded hover:bg-red-500/10 inline-grid place-items-center text-slate-400 hover:text-red-400"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editing && (
          <ComponentDialog
            initial={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSave={(data) => {
              if (editing === "new") addComponent(data);
              else updateComponent(editing.id, data);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ComponentDialog({ initial, onClose, onSave }: { initial: Component | null; onClose: () => void; onSave: (c: Omit<Component, "id">) => void }) {
  const [c, setC] = useState<Omit<Component, "id">>(initial ?? {
    sku: "", name: "", category: "Microcontroller", price: 0, stock: 0, description: "", details: "", emoji: "🔧",
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 p-8 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{initial ? "Edit component" : "New component"}</h2>
          <button onClick={onClose} className="size-8 rounded hover:bg-white/5 grid place-items-center"><X className="size-4 text-slate-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(c); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Inp label="Name" value={c.name} onChange={(v) => setC({ ...c, name: v })} />
            <Inp label="SKU" value={c.sku} onChange={(v) => setC({ ...c, sku: v })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Category</span>
              <select value={c.category} onChange={(e) => setC({ ...c, category: e.target.value as Category })} className="mt-1 w-full h-11 rounded-lg bg-slate-950 border border-white/10 px-3 text-white">
                {CATS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <Inp label="Price (₦)" value={String(c.price)} onChange={(v) => setC({ ...c, price: Number(v) || 0 })} />
            <Inp label="Stock" value={String(c.stock)} onChange={(v) => setC({ ...c, stock: Number(v) || 0 })} />
          </div>
          <Inp label="Emoji" value={c.emoji} onChange={(v) => setC({ ...c, emoji: v })} />
          <Inp label="Short description" value={c.description} onChange={(v) => setC({ ...c, description: v })} />
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Detailed specs</span>
            <textarea rows={3} value={c.details} onChange={(e) => setC({ ...c, details: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 border border-white/10 p-3 text-white" />
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-5 py-2.5 rounded-lg bg-brand-accent text-white font-semibold hover:bg-blue-600">Save</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Inp({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required className="mt-1 w-full h-11 rounded-lg bg-slate-950 border border-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40" />
    </label>
  );
}