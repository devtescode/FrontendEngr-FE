import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ImagePlus,
  Package,
  Search,
  Boxes,
  AlertTriangle,
  Check,
  PackageX,
  TrendingDown,
  ShoppingBag,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  componentApi,
  type BackendComponent,
} from "../lib/api";

import type { Category } from "@/lib/data";
import { socket } from "@/lib/socket";

export const Route = createFileRoute("/admin/components")({
  head: () => ({
    meta: [{ title: "Inventory — EU Hardware Store" }],
  }),
  component: AdminComponents,
});

const CATS: Category[] = [
  "Microcontroller",
  "Sensors",
  "Prototyping",
  "Passive",
  "Power",
  "Connector",
];

type ComponentFormData = Omit<BackendComponent, "_id">;

type SaveData = {
  data: ComponentFormData;
  imageFile: File | null;
};

type StockFilter = "all" | "in-stock" | "low" | "out";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

// =====================================================
// HELPERS
// =====================================================

function getComponentId(c: any): string {
  return String(c?._id ?? c?.id ?? "");
}


function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =====================================================
// SKU GENERATOR
// =====================================================

function generateSKU(
  name: string,
  components: BackendComponent[],
  currentId?: string
) {
  const cleanedName = name.trim();
  if (!cleanedName) return "";

  const lettersOnly = cleanedName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  if (!lettersOnly) return "";

  const prefix = lettersOnly.substring(0, 3);

  const existingNumbers = components
    .filter((component) => {
      if (currentId && getComponentId(component) === currentId) return false;
      if (!component.sku) return false;
      return component.sku.trim().toUpperCase().startsWith(`${prefix}-`);
    })
    .map((component) => {
      const match = component.sku
        .trim()
        .toUpperCase()
        .match(new RegExp(`^${prefix}-(\\d{4})$`));
      if (!match) return 0;
      return Number(match[1]);
    })
    .filter((number) => number > 0);

  let nextNumber = 1;
  while (existingNumbers.includes(nextNumber)) {
    nextNumber++;
  }

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

function skuExists(
  sku: string,
  components: BackendComponent[],
  currentId?: string
) {
  if (!sku) return false;
  return components.some((component) => {
    if (currentId && getComponentId(component) === currentId) return false;
    return (
      component.sku?.trim().toUpperCase() === sku.trim().toUpperCase()
    );
  });
}

// =====================================================
// ADMIN COMPONENTS
// =====================================================

function AdminComponents() {
  const [components, setComponents] = useState<BackendComponent[]>([]);
  const [editing, setEditing] = useState<
    BackendComponent | "new" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirm-delete modal
  const [pendingDelete, setPendingDelete] =
    useState<BackendComponent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // =====================================================
  // TOASTS
  // =====================================================
  const pushToast = (kind: ToastKind, message: string) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // =====================================================
  // FETCH
  // =====================================================
  const fetchComponents = async () => {
    try {
      setLoading(true);

      const response = await componentApi.getAll();
      setComponents(response);
    } catch (error: any) {
      console.error("Fetch components error:", error);
      pushToast(
        "error",
        error?.message || "Failed to load components"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // REAL-TIME UPDATES
  // =====================================================
  useEffect(() => {
    const handleUpdated = (component: BackendComponent) => {
      const incomingId = getComponentId(component);
      if (!incomingId) return;

      setComponents((current) =>
        current.map((item) =>
          getComponentId(item) === incomingId ? component : item
        )
      );
    };

    const handleCreated = (component: BackendComponent) => {
      const incomingId = getComponentId(component);
      if (!incomingId) return;

      setComponents((current) => {
        const exists = current.some(
          (item) => getComponentId(item) === incomingId
        );
        if (exists) return current;
        return [component, ...current];
      });
    };

    const handleDeleted = (component: BackendComponent) => {
      const id = getComponentId(component);
      if (!id) return;

      setComponents((current) =>
        current.filter((item) => getComponentId(item) !== id)
      );
    };

    socket.on("component:updated", handleUpdated);
    socket.on("component:created", handleCreated);
    socket.on("component:deleted", handleDeleted);

    return () => {
      socket.off("component:updated", handleUpdated);
      socket.off("component:created", handleCreated);
      socket.off("component:deleted", handleDeleted);
    };
  }, []);
  

  // =====================================================
  // COUNTS
  // =====================================================
  const counts = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let out = 0;
    let totalStock = 0;
    let totalSold = 0;

    for (const c of components) {
      const stock = Number(c.stock) || 0;
      const sold = Number(c.soldCount) || 0;

      totalStock += stock;
      totalSold += sold;

      if (stock <= 0) out++;
      else if (stock < 10) low++;
      else inStock++;
    }

    return {
      all: components.length,
      inStock,
      low,
      out,
      totalStock,
      totalSold,
    };
  }, [components]);

  // =====================================================
  // FILTERED
  // =====================================================
  const filteredComponents = useMemo(() => {
    let result = components;

    const value = search.trim().toLowerCase();
    if (value) {
      result = result.filter(
        (component) =>
          component.name.toLowerCase().includes(value) ||
          component.sku.toLowerCase().includes(value) ||
          component.category.toLowerCase().includes(value)
      );
    }

    if (stockFilter !== "all") {
      result = result.filter((component) => {
        const stock = Number(component.stock) || 0;
        if (stockFilter === "out") return stock <= 0;
        if (stockFilter === "low") return stock > 0 && stock < 10;
        if (stockFilter === "in-stock") return stock >= 10;
        return true;
      });
    }

    return result;
  }, [components, search, stockFilter]);

  // =====================================================
  // SAVE
  // =====================================================
  const handleSave = async ({ data, imageFile }: SaveData) => {
    try {
      if (editing === "new") {
        const generatedSKU = generateSKU(data.name, components);

        if (!generatedSKU) {
          throw new Error(
            "Please enter a valid component name."
          );
        }

        if (skuExists(generatedSKU, components)) {
          throw new Error(
            `SKU ${generatedSKU} already exists. Try a different name.`
          );
        }

        const created = await componentApi.create(
          { ...data, sku: generatedSKU },
          imageFile
        );

        const createdId = getComponentId(created);
        if (!createdId) {
          throw new Error(
            "Server did not return the created component."
          );
        }

        setComponents((prev) => {
          const exists = prev.some(
            (c) => getComponentId(c) === createdId
          );
          return exists ? prev : [created, ...prev];
        });

        pushToast(
          "success",
          `${created.name} added to inventory`
        );
      } else if (editing) {
        const editingId = getComponentId(editing);

        if (!editingId) {
          throw new Error("Invalid component ID.");
        }

        const generatedSKU = generateSKU(
          data.name,
          components,
          editingId
        );

        if (!generatedSKU) {
          throw new Error(
            "Please enter a valid component name."
          );
        }

        if (skuExists(generatedSKU, components, editingId)) {
          throw new Error(
            `SKU ${generatedSKU} already exists.`
          );
        }

        const updated = await componentApi.update(
          editingId,
          { ...data, sku: generatedSKU },
          imageFile
        );

        setComponents((prev) =>
          prev.map((c) =>
            getComponentId(c) === editingId ? updated : c
          )
        );

        pushToast(
          "success",
          `${updated.name} updated`
        );
      }

      setEditing(null);
    } catch (error: any) {
      console.error("Save component error:", error);
      pushToast(
        "error",
        error?.message || "Failed to save component"
      );
      throw error;
    }
  };

  // =====================================================
  // DELETE
  // =====================================================
  const requestDelete = (component: BackendComponent) => {
    const id = getComponentId(component);

    if (!id) {
      pushToast(
        "error",
        "This component is missing an ID. Refresh the page."
      );
      return;
    }

    setPendingDelete(component);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    const id = getComponentId(pendingDelete);
    if (!id) {
      setPendingDelete(null);
      return;
    }

    try {
      setDeleting(true);

      await componentApi.delete(id);

      setComponents((prev) =>
        prev.filter((item) => getComponentId(item) !== id)
      );

      pushToast(
        "success",
        `${pendingDelete.name} deleted`
      );

      setPendingDelete(null);
    } catch (error: any) {
      console.error("Delete component error:", error);
      pushToast(
        "error",
        error?.message || "Failed to delete component"
      );
    } finally {
      setDeleting(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="min-h-screen bg-slate-950 p-5 sm:p-8 lg:p-10">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent">
              <Package className="size-5" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white">
                Inventory
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your hardware components, stock and product
                information.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditing("new")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-accent px-5 font-semibold text-white shadow-lg shadow-brand-accent/10 transition hover:scale-[1.02] hover:bg-blue-600 active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Add component
        </button>
      </div>

      {/* STATS */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="size-5" />}
          label="Total components"
          value={components.length}
          accent="slate"
          active={stockFilter === "all"}
          onClick={() => setStockFilter("all")}
        />

        <StatCard
          icon={<ShoppingBag className="size-5" />}
          label="Units purchased"
          value={counts.totalSold}
          accent="blue"
        />

        <StatCard
          icon={<PackageX className="size-5" />}
          label="Out of stock"
          value={counts.out}
          accent="red"
          active={stockFilter === "out"}
          onClick={() => setStockFilter("out")}
        />

        <StatCard
          icon={<TrendingDown className="size-5" />}
          label="Low stock"
          value={counts.low}
          accent="amber"
          active={stockFilter === "low"}
          onClick={() => setStockFilter("low")}
        />
      </div>

      {/* SEARCH + FILTER PILLS */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, SKU or category..."
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            count={counts.all}
            active={stockFilter === "all"}
            onClick={() => setStockFilter("all")}
            tone="slate"
          />
          <FilterPill
            label="In stock"
            count={counts.inStock}
            active={stockFilter === "in-stock"}
            onClick={() => setStockFilter("in-stock")}
            tone="green"
          />
          <FilterPill
            label="Low"
            count={counts.low}
            active={stockFilter === "low"}
            onClick={() => setStockFilter("low")}
            tone="amber"
          />
          <FilterPill
            label="Out"
            count={counts.out}
            active={stockFilter === "out"}
            onClick={() => setStockFilter("out")}
            tone="red"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">
              Product inventory
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {stockFilter === "all"
                ? "All components added to the store."
                : stockFilter === "out"
                  ? "Components that need restocking."
                  : stockFilter === "low"
                    ? "Components running low — restock soon."
                    : "Components with healthy stock levels."}
            </p>
          </div>

          <div className="hidden text-xs text-slate-500 sm:block">
            {filteredComponents.length} of {components.length} shown
          </div>
        </div>

        {loading ? (
          <InventorySkeleton />
        ) : components.length === 0 ? (
          <EmptyState
            icon={<Package className="size-7 text-slate-600" />}
            title="No components found"
            description="Add your first hardware component to start building your inventory."
            action={
              <button
                onClick={() => setEditing("new")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
              >
                <Plus className="size-4" />
                Add component
              </button>
            }
          />
        ) : filteredComponents.length === 0 ? (
          <EmptyState
            icon={<Search className="size-8 text-slate-600" />}
            title="No matching products"
            description="Try a different search term or clear the stock filter."
            action={
              <button
                onClick={() => {
                  setSearch("");
                  setStockFilter("all");
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-left">Product</th>
                  <th className="px-5 py-4 text-left">Category</th>
                  <th className="px-5 py-4 text-left">SKU</th>
                  <th className="px-5 py-4 text-right">Price</th>
                  <th className="px-5 py-4 text-center">In stock</th>
                  <th className="px-5 py-4 text-center">Purchased</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredComponents.map((c, index) => {
                  const id = getComponentId(c);
                  const stock = Number(c.stock) || 0;
                  const sold = Number(c.soldCount) || 0;
                  const isOut = stock <= 0;
                  const isLow = stock > 0 && stock < 10;

                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                      className="border-t border-white/5 transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          {c.image ? (
                            <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                              <img
                                src={c.image}
                                alt={c.name}
                                className="size-14 object-cover transition duration-300 hover:scale-110"
                              />
                            </div>
                          ) : (
                            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                              <ImagePlus className="size-5 text-slate-600" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {c.name}
                            </p>
                            <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">
                              {c.description || "No description available"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                          {c.category}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-black/20 px-2 py-1 font-mono text-xs text-slate-400">
                          {c.sku}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-white">
                          ₦{Number(c.price).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`text-lg font-bold tabular-nums ${isOut
                              ? "text-red-400"
                              : isLow
                                ? "text-amber-400"
                                : "text-emerald-400"
                              }`}
                          >
                            {stock}
                          </span>

                          <StockBadge stock={stock} />
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="text-base font-semibold tabular-nums text-white">
                          {sold}
                        </span>
                        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
                          {sold === 1 ? "unit" : "units"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditing(c)}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                            title="Edit component"
                          >
                            <Pencil className="size-4" />
                          </button>

                          <button
                            onClick={() => requestDelete(c)}
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                            title="Delete component"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIALOG — ADD / EDIT */}
      <AnimatePresence>
        {editing && (
          <ComponentDialog
            initial={editing === "new" ? null : editing}
            components={components}
            onClose={() => setEditing(null)}
            onSave={handleSave}
            onInvalid={(msg) => pushToast("error", msg)}
          />
        )}
      </AnimatePresence>

      {/* DIALOG — DELETE CONFIRMATION */}
      <AnimatePresence>
        {pendingDelete && (
          <DeleteConfirmDialog
            component={pendingDelete}
            deleting={deleting}
            onCancel={() => {
              if (!deleting) setPendingDelete(null);
            }}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>

      {/* TOASTS */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// =====================================================
// DELETE CONFIRM DIALOG
// =====================================================

function DeleteConfirmDialog({
  component,
  deleting,
  onCancel,
  onConfirm,
}: {
  component: BackendComponent;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        <div className="p-6">
          <div className="mb-5 flex justify-center">
            <motion.div
              initial={{ scale: 0.6, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.05,
                type: "spring",
                stiffness: 300,
                damping: 18,
              }}
              className="grid size-14 place-items-center rounded-2xl bg-red-500/10 ring-4 ring-red-500/10"
            >
              <Trash2 className="size-6 text-red-400" />
            </motion.div>
          </div>

          <h3 className="text-center text-lg font-bold text-white">
            Delete this component?
          </h3>

          <p className="mt-2 text-center text-sm text-slate-400">
            This will permanently remove it from your inventory. This
            action cannot be undone.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
            {component.image ? (
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                <img
                  src={component.image}
                  alt={component.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5">
                <Package className="size-5 text-slate-600" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {component.name}
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                {component.sku}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =====================================================
// TOAST STACK
// =====================================================

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[70] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const config = {
    success: {
      icon: CheckCircle2,
      ring: "ring-emerald-500/30",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      iconColor: "text-emerald-400",
    },
    error: {
      icon: AlertTriangle,
      ring: "ring-red-500/30",
      bg: "bg-red-500/10",
      text: "text-red-300",
      iconColor: "text-red-400",
    },
    info: {
      icon: Info,
      ring: "ring-blue-500/30",
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      iconColor: "text-blue-400",
    },
  }[toast.kind];

  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md ring-1 ${config.ring}`}
    >
      <div
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${config.bg}`}
      >
        <Icon className={`size-4 ${config.iconColor}`} />
      </div>

      <p
        className={`min-w-0 flex-1 pt-1 text-sm font-medium ${config.text}`}
      >
        {toast.message}
      </p>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  icon,
  label,
  value,
  accent = "slate",
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "slate" | "blue" | "amber" | "red";
  active?: boolean;
  onClick?: () => void;
}) {
  const accents = {
    slate: {
      icon: "bg-white/5 text-slate-400",
      ring: "ring-slate-500/20",
    },
    blue: {
      icon: "bg-blue-500/10 text-blue-400",
      ring: "ring-blue-500/20",
    },
    amber: {
      icon: "bg-amber-500/10 text-amber-400",
      ring: "ring-amber-500/20",
    },
    red: {
      icon: "bg-red-500/10 text-red-400",
      ring: "ring-red-500/20",
    },
  } as const;

  const a = accents[accent];
  const clickable = Boolean(onClick);

  return (
    <motion.button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 text-left transition-all ${active
        ? `border-transparent bg-slate-800/80 ring-2 ${a.ring}`
        : "border-white/10 bg-slate-900 hover:border-white/20"
        } ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`grid size-10 place-items-center rounded-xl ${a.icon}`}
        >
          {icon}
        </div>

        <span className="text-2xl font-bold tabular-nums text-white">
          {value.toLocaleString()}
        </span>
      </div>

      <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">
        {label}
      </p>
    </motion.button>
  );
}

// =====================================================
// FILTER PILL
// =====================================================

function FilterPill({
  label,
  count,
  active,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone: "slate" | "green" | "amber" | "red";
}) {
  const tones = {
    slate: {
      active: "bg-slate-700 text-white ring-slate-600",
      dot: "bg-slate-400",
    },
    green: {
      active: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
      dot: "bg-emerald-400",
    },
    amber: {
      active: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
      dot: "bg-amber-400",
    },
    red: {
      active: "bg-red-500/20 text-red-300 ring-red-500/40",
      dot: "bg-red-400",
    },
  } as const;

  const t = tones[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all ${active
        ? `${t.active} border-transparent ring-1`
        : "border-white/10 bg-slate-900 text-slate-400 hover:border-white/20 hover:text-white"
        }`}
    >
      {tone !== "slate" && (
        <span className={`size-1.5 rounded-full ${t.dot}`} />
      )}
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${active ? "bg-white/10" : "bg-white/5"
          }`}
      >
        {count}
      </span>
    </button>
  );
}

// =====================================================
// STOCK BADGE
// =====================================================

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-400 ring-1 ring-red-500/20">
        <span className="size-1 rounded-full bg-red-400" />
        Out of stock
      </span>
    );
  }

  if (stock < 10) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 ring-1 ring-amber-500/20">
        <span className="size-1 rounded-full bg-amber-400" />
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/20">
      <span className="size-1 rounded-full bg-emerald-400" />
      In stock
    </span>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-white/5">
        {icon}
      </div>

      <h3 className="text-lg font-semibold text-white">{title}</h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {description}
      </p>

      {action}
    </div>
  );
}

// =====================================================
// SKELETON
// =====================================================

function InventorySkeleton() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-10 backdrop-blur-[2px]" />

      <div className="animate-pulse">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-5 border-t border-white/5 px-5 py-5"
          >
            <div className="size-14 shrink-0 rounded-xl bg-white/10" />
            <div className="w-[260px] space-y-2">
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="h-3 w-56 rounded bg-white/5" />
            </div>
            <div className="h-7 w-24 rounded-full bg-white/10" />
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="ml-auto h-4 w-20 rounded bg-white/10" />
            <div className="flex gap-2">
              <div className="size-9 rounded-lg bg-white/10" />
              <div className="size-9 rounded-lg bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-5 py-3 text-sm text-slate-300 shadow-xl backdrop-blur-md">
          <Loader2 className="size-4 animate-spin text-brand-accent" />
          Loading inventory...
        </div>
      </div>
    </div>
  );
}

// =====================================================
// COMPONENT DIALOG
// =====================================================

function ComponentDialog({
  initial,
  components,
  onClose,
  onSave,
  onInvalid,
}: {
  initial: BackendComponent | null;
  components: BackendComponent[];
  onClose: () => void;
  onSave: (data: SaveData) => Promise<void>;
  onInvalid: (message: string) => void;
}) {
  const initialId = getComponentId(initial);

  const [c, setC] = useState<ComponentFormData>(
    initial
      ? {
          sku: initial.sku,
          name: initial.name,
          category: initial.category,
          price: initial.price,
          stock: initial.stock,
          description: initial.description || "",
          details: initial.details || "",
          image: initial.image || "",
        }
      : {
          sku: "",
          name: "",
          category: "Microcontroller",
          price: 0,
          stock: 0,
          description: "",
          details: "",
          image: "",
        }
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(initial?.image || "");
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const generatedSKU = useMemo(
    () => generateSKU(c.name, components, initialId || undefined),
    [c.name, components, initialId]
  );

  useEffect(() => {
    if (!c.name.trim()) {
      setC((prev) => ({ ...prev, sku: "" }));
      return;
    }
    setC((prev) => ({ ...prev, sku: generatedSKU }));
  }, [generatedSKU]);

  // =====================================================
  // IMAGE HELPERS
  // =====================================================

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      onInvalid("Please select a valid image (PNG, JPG, or WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onInvalid("Image must be less than 5MB.");
      return;
    }

    setImageFile(file);

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);

    // Reset the input value so selecting the same file twice
    // still triggers onChange.
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    processImageFile(file);
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview("");
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!c.name.trim()) {
      onInvalid("Please enter the component name.");
      return;
    }

    const finalSKU = generateSKU(
      c.name,
      components,
      initialId || undefined
    );

    if (!finalSKU) {
      onInvalid(
        "Unable to generate SKU. Please check the component name."
      );
      return;
    }

    if (skuExists(finalSKU, components, initialId || undefined)) {
      onInvalid(`SKU ${finalSKU} already exists.`);
      return;
    }

    try {
      setSaving(true);
      await onSave({
        data: { ...c, sku: finalSKU },
        imageFile,
      });
    } catch (error) {
      console.error("Dialog save error:", error);
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // CLEANUP BLOB URLs
  // =====================================================

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-white">
              {initial ? "Edit component" : "New component"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {initial
                ? "Update product information and stock."
                : "Add a new component to your inventory."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="max-h-[80vh] overflow-y-auto p-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Name
              </span>
              <input
                type="text"
                value={c.name}
                onChange={(e) =>
                  setC({ ...c, name: e.target.value })
                }
                required
                autoFocus
                placeholder="e.g. Wire"
                className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  SKU
                </span>
                {c.name.trim() && c.sku && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400">
                    <Check className="size-3" />
                    Auto-generated
                  </span>
                )}
              </div>

              <input
                type="text"
                value={c.sku}
                readOnly
                placeholder="WIR-0001"
                className="mt-1 h-11 w-full cursor-not-allowed rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-sm font-semibold tracking-wide text-brand-accent outline-none"
              />

              <p className="mt-1.5 text-[10px] text-slate-600">
                SKU is automatically generated from the component name.
              </p>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Category
              </span>
              <select
                value={c.category}
                onChange={(e) =>
                  setC({ ...c, category: e.target.value as Category })
                }
                className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
              >
                {CATS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <Inp
              label="Price (₦)"
              type="number"
              value={String(c.price)}
              onChange={(v) =>
                setC({ ...c, price: Number(v) || 0 })
              }
            />

            <Inp
              label="Stock"
              type="number"
              value={String(c.stock)}
              onChange={(v) =>
                setC({ ...c, stock: Number(v) || 0 })
              }
            />
          </div>

          {/* PRODUCT IMAGE */}
          <div className="mt-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Product image
            </span>

            {!imagePreview ? (
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-slate-950/60 px-6 py-8 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-brand-accent bg-brand-accent/10 scale-[1.01]"
                    : "border-white/10 hover:border-white/20 hover:bg-slate-950"
                }`}
              >
                <motion.div
                  animate={
                    isDragging
                      ? { scale: 1.1, rotate: -4 }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className={`grid size-12 place-items-center rounded-2xl ${
                    isDragging
                      ? "bg-brand-accent/20 text-brand-accent"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  <ImagePlus className="size-5" />
                </motion.div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {isDragging
                      ? "Drop image to upload"
                      : "Click to upload or drag and drop"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PNG, JPG, or WebP · Max 5MB
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-full w-full object-contain"
                  />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg bg-slate-950/80 text-slate-300 backdrop-blur-sm transition hover:bg-red-500 hover:text-white"
                    aria-label="Remove image"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {imageFile?.name || "Current image"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {imageFile
                        ? formatFileSize(imageFile.size)
                        : "Uploaded previously"}
                    </p>
                  </div>

                  <label className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
                    Replace
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </div>

          {/* SHORT DESCRIPTION */}
          <div className="mt-4">
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Short description
              </span>

              <textarea
                rows={3}
                value={c.description}
                onChange={(e) =>
                  setC({ ...c, description: e.target.value })
                }
                placeholder="A short description that appears on the product card..."
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
              />
            </label>
          </div>

          {/* ACTIONS */}
          <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !c.name.trim() || !c.sku}
              className="flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving
                ? "Saving..."
                : initial
                  ? "Update component"
                  : "Save component"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// =====================================================
// INPUT
// =====================================================

function Inp({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        min={type === "number" ? "0" : undefined}
        className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
      />
    </label>
  );
}

export default AdminComponents;