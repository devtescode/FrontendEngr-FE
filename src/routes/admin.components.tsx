import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { componentApi, type BackendComponent } from "../lib/api";
import type { Category } from "@/lib/data";

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

function AdminComponents() {
  const [components, setComponents] = useState<BackendComponent[]>([]);

  const [editing, setEditing] = useState<
    BackendComponent | "new" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ============================
   * FETCH COMPONENTS
   * ============================
   */

  const fetchComponents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await componentApi.getAll();

      console.log("Fetched components:", response);

      setComponents(response);
    } catch (error: any) {
      console.error("Fetch components error:", error);

      setError(
        error?.message || "Failed to load components"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  /*
   * ============================
   * ADD / UPDATE COMPONENT
   * ============================
   */
  const handleSave = async ({
    data,
    imageFile,
  }: SaveData) => {
    try {
      setError("");

      /*
       * CREATE
       */
      if (editing === "new") {
        const response = await componentApi.create(
          data,
          imageFile
        );

        console.log(
          "Created component:",
          response
        );

        setComponents((prev) => [
          response,
          ...prev,
        ]);
      }

      /*
       * UPDATE
       */
      else if (editing?._id) {
        const response =
          await componentApi.update(
            editing._id,
            data,
            imageFile
          );

        console.log(
          "Updated component:",
          response
        );

        setComponents((prev) =>
          prev.map((component) =>
            component._id === editing._id
              ? response
              : component
          )
        );
      }

      setEditing(null);
    } catch (error: any) {
      console.error(
        "Save component error:",
        error
      );

      setError(
        error?.message ||
        "Failed to save component"
      );

      throw error;
    }
  };
  /*
   * ============================
   * DELETE COMPONENT
   * ============================
   */
  const handleDelete = async (
    component: BackendComponent
  ) => {
    if (!component._id) return;

    const confirmed = window.confirm(
      `Delete ${component.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await componentApi.delete(
        component._id
      );

      setComponents((prev) =>
        prev.filter(
          (item) =>
            item._id !== component._id
        )
      );
    } catch (error: any) {
      console.error(
        "Delete component error:",
        error
      );

      setError(
        error?.message ||
        "Failed to delete component"
      );
    }
  };

  return (
    <div className="p-10">
      {/* ============================
          HEADER
      ============================ */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Inventory
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            {components.length} components in stock.
          </p>
        </div>

        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-accent text-white px-5 py-2.5 font-semibold hover:bg-blue-600"
        >
          <Plus className="size-4" />
          Add component
        </button>
      </div>

      {/* ============================
          ERROR
      ============================ */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ============================
          TABLE
      ============================ */}
      <div className="rounded-2xl border border-white/5 bg-slate-950 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="size-5 animate-spin mr-2" />
            Loading components...
          </div>
        ) : components.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No components found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3">
                    Component
                  </th>

                  <th className="text-left px-5 py-3">
                    Category
                  </th>

                  <th className="text-left px-5 py-3">
                    SKU
                  </th>

                  <th className="text-right px-5 py-3">
                    Price
                  </th>

                  <th className="text-right px-5 py-3">
                    Stock
                  </th>

                  <th className="px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {components.map((c) => (
                  <tr
                    key={c._id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    {/* COMPONENT */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.name}
                            className="size-12 rounded-lg object-cover bg-white/5"
                          />
                        ) : (
                          <div className="size-12 rounded-lg bg-white/5 grid place-items-center text-slate-500">
                            <ImagePlus className="size-5" />
                          </div>
                        )}

                        <div>
                          <p className="font-medium text-white">
                            {c.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {c.sku}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td className="px-5 py-3 text-slate-400">
                      {c.category}
                    </td>

                    {/* SKU */}
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {c.sku}
                    </td>

                    {/* PRICE */}
                    <td className="px-5 py-3 text-right">
                      ₦{Number(c.price).toLocaleString()}
                    </td>

                    {/* STOCK */}
                    <td
                      className={`px-5 py-3 text-right font-semibold ${c.stock < 10
                          ? "text-amber-400"
                          : "text-white"
                        }`}
                    >
                      {c.stock}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() =>
                          setEditing(c)
                        }
                        className="size-8 rounded hover:bg-white/5 inline-grid place-items-center text-slate-400 hover:text-white mr-1"
                        title="Edit component"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(c)
                        }
                        className="size-8 rounded hover:bg-red-500/10 inline-grid place-items-center text-slate-400 hover:text-red-400"
                        title="Delete component"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================
          DIALOG
      ============================ */}
      <AnimatePresence>
        {editing && (
          <ComponentDialog
            initial={
              editing === "new"
                ? null
                : editing
            }
            onClose={() =>
              setEditing(null)
            }
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/*
 * ==========================================
 * COMPONENT DIALOG
 * ==========================================
 */

function ComponentDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: BackendComponent | null;

  onClose: () => void;

  onSave: (
    data: SaveData
  ) => Promise<void>;
}) {
  const [c, setC] =
    useState<ComponentFormData>(
      initial
        ? {
          sku: initial.sku,
          name: initial.name,
          category: initial.category,
          price: initial.price,
          stock: initial.stock,
          description:
            initial.description || "",
          details:
            initial.details || "",
          image:
            initial.image || "",
        }
        : {
          sku: "",
          name: "",
          category:
            "Microcontroller",
          price: 0,
          stock: 0,
          description: "",
          details: "",
          image: "",
        }
    );

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState(
      initial?.image || ""
    );

  const [saving, setSaving] =
    useState(false);

  /*
   * ============================
   * IMAGE SELECT
   * ============================
   */
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    /*
     * Optional validation
     */
    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image."
      );
      return;
    }

    /*
     * 5MB limit
     */
    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Image must be less than 5MB."
      );
      return;
    }

    setImageFile(file);

    /*
     * Remove old preview URL
     * before creating another one.
     */
    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  /*
   * ============================
   * SUBMIT
   * ============================
   */
  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      setSaving(true);

      await onSave({
        data: c,
        imageFile,
      });
    } catch (error) {
      console.error(
        "Dialog save error:",
        error
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================
   * CLEANUP IMAGE PREVIEW
   * ============================
   */
  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-6"
    >
      <motion.div
        initial={{
          scale: 0.95,
          y: 10,
        }}
        animate={{
          scale: 1,
          y: 0,
        }}
        exit={{
          scale: 0.95,
          y: 10,
        }}
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 p-8 max-h-[90vh] overflow-auto"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {initial
              ? "Edit component"
              : "New component"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded hover:bg-white/5 grid place-items-center"
          >
            <X className="size-4 text-slate-400" />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          {/* NAME + SKU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp
              label="Name"
              value={c.name}
              onChange={(v) =>
                setC({
                  ...c,
                  name: v,
                })
              }
            />

            <Inp
              label="SKU"
              value={c.sku}
              onChange={(v) =>
                setC({
                  ...c,
                  sku: v,
                })
              }
            />
          </div>

          {/* CATEGORY + PRICE + STOCK */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CATEGORY */}
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Category
              </span>

              <select
                value={c.category}
                onChange={(e) =>
                  setC({
                    ...c,
                    category:
                      e.target
                        .value as Category,
                  })
                }
                className="mt-1 w-full h-11 rounded-lg bg-slate-950 border border-white/10 px-3 text-white"
              >
                {CATS.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {/* PRICE */}
            <Inp
              label="Price (₦)"
              type="number"
              value={String(c.price)}
              onChange={(v) =>
                setC({
                  ...c,
                  price:
                    Number(v) || 0,
                })
              }
            />

            {/* STOCK */}
            <Inp
              label="Stock"
              type="number"
              value={String(c.stock)}
              onChange={(v) =>
                setC({
                  ...c,
                  stock:
                    Number(v) || 0,
                })
              }
            />
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Product image
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={
                  handleImageChange
                }
                className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-accent file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-600"
              />
            </label>

            {/* IMAGE PREVIEW */}
            {imagePreview && (
              <div className="mt-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                  Preview
                </p>

                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="h-32 w-32 rounded-xl object-cover border border-white/10"
                />
              </div>
            )}
          </div>

          {/* DESCRIPTION */}
          <Inp
            label="Short description"
            value={c.description}
            onChange={(v) =>
              setC({
                ...c,
                description: v,
              })
            }
          />

          {/* DETAILS */}
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Detailed specs
            </span>

            <textarea
              rows={4}
              value={c.details}
              onChange={(e) =>
                setC({
                  ...c,
                  details:
                    e.target.value,
                })
              }
              className="mt-1 w-full rounded-lg bg-slate-950 border border-white/10 p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
            />
          </label>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand-accent text-white font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {saving
                ? "Saving..."
                : "Save component"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/*
 * ==========================================
 * INPUT COMPONENT
 * ==========================================
 */

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
        onChange={(e) =>
          onChange(e.target.value)
        }
        required
        min={
          type === "number"
            ? "0"
            : undefined
        }
        className="mt-1 w-full h-11 rounded-lg bg-slate-950 border border-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
      />
    </label>
  );
}