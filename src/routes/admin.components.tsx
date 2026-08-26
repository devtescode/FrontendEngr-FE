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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  componentApi,
  type BackendComponent,
} from "../lib/api";

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

/*
 * =====================================================
 * SKU GENERATOR
 * =====================================================
 *
 * Examples:
 *
 * Wire       -> WIR-0001
 * Wire       -> WIR-0002
 * Black Wire -> BLA-0001
 * Resistor   -> RES-0001
 *
 * The function checks the existing components and finds
 * the next available number.
 */

function generateSKU(
  name: string,
  components: BackendComponent[],
  currentId?: string
) {
  const cleanedName = name.trim();

  if (!cleanedName) {
    return "";
  }

  /*
   * Remove spaces and special characters.
   * We only need the first 3 letters.
   */
  const lettersOnly = cleanedName
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  /*
   * Need at least one character.
   */
  if (!lettersOnly) {
    return "";
  }

  /*
   * First 3 characters.
   *
   * Wire -> WIR
   * Resistor -> RES
   * Black Wire -> BLA
   */
  const prefix = lettersOnly.substring(0, 3);

  /*
   * Find all existing SKUs using this prefix.
   */
  const existingNumbers = components
    .filter((component) => {
      /*
       * When editing a component, don't compare it
       * against itself.
       */
      if (
        currentId &&
        component._id === currentId
      ) {
        return false;
      }

      if (!component.sku) {
        return false;
      }

      const sku = component.sku
        .trim()
        .toUpperCase();

      return sku.startsWith(`${prefix}-`);
    })
    .map((component) => {
      const match = component.sku
        .trim()
        .toUpperCase()
        .match(
          new RegExp(`^${prefix}-(\\d{4})$`)
        );

      if (!match) {
        return 0;
      }

      return Number(match[1]);
    })
    .filter((number) => number > 0);

  /*
   * Find the next available number.
   *
   * Example:
   * WIR-0001
   * WIR-0002
   * WIR-0004
   *
   * The next one becomes WIR-0003.
   */
  let nextNumber = 1;

  while (
    existingNumbers.includes(nextNumber)
  ) {
    nextNumber++;
  }

  /*
   * Convert:
   *
   * 1    -> 0001
   * 12   -> 0012
   * 123  -> 0123
   * 1234 -> 1234
   */
  const formattedNumber =
    String(nextNumber).padStart(4, "0");

  return `${prefix}-${formattedNumber}`;
}

/*
 * =====================================================
 * CHECK IF SKU ALREADY EXISTS
 * =====================================================
 */

function skuExists(
  sku: string,
  components: BackendComponent[],
  currentId?: string
) {
  if (!sku) {
    return false;
  }

  return components.some((component) => {
    if (
      currentId &&
      component._id === currentId
    ) {
      return false;
    }

    return (
      component.sku?.trim().toUpperCase() ===
      sku.trim().toUpperCase()
    );
  });
}

/*
 * =====================================================
 * ADMIN COMPONENTS
 * =====================================================
 */

function AdminComponents() {
  const [components, setComponents] = useState<
    BackendComponent[]
  >([]);

  const [editing, setEditing] = useState<
    BackendComponent | "new" | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  /*
   * =====================================================
   * FETCH COMPONENTS
   * =====================================================
   */

  const fetchComponents = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await componentApi.getAll();

      console.log(
        "Fetched components:",
        response
      );

      setComponents(response);
    } catch (error: any) {
      console.error(
        "Fetch components error:",
        error
      );

      setError(
        error?.message ||
          "Failed to load components"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  /*
   * =====================================================
   * FILTER COMPONENTS
   * =====================================================
   */

  const filteredComponents = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return components;
    }

    return components.filter(
      (component) => {
        return (
          component.name
            .toLowerCase()
            .includes(value) ||
          component.sku
            .toLowerCase()
            .includes(value) ||
          component.category
            .toLowerCase()
            .includes(value)
        );
      }
    );
  }, [components, search]);

  /*
   * =====================================================
   * TOTAL STOCK
   * =====================================================
   */

  const totalStock = useMemo(() => {
    return components.reduce(
      (total, component) =>
        total +
        Number(component.stock || 0),
      0
    );
  }, [components]);

  /*
   * =====================================================
   * LOW STOCK
   * =====================================================
   */

  const lowStock = useMemo(() => {
    return components.filter(
      (component) =>
        Number(component.stock) > 0 &&
        Number(component.stock) < 10
    ).length;
  }, [components]);

  /*
   * =====================================================
   * OUT OF STOCK
   * =====================================================
   */

  const outOfStock = useMemo(() => {
    return components.filter(
      (component) =>
        Number(component.stock) <= 0
    ).length;
  }, [components]);

  /*
   * =====================================================
   * ADD / UPDATE COMPONENT
   * =====================================================
   */

  const handleSave = async ({
    data,
    imageFile,
  }: SaveData) => {
    try {
      setError("");

      /*
       * =================================================
       * CREATE
       * =================================================
       */

      if (editing === "new") {
        /*
         * Generate SKU again immediately before saving.
         *
         * This is important because another product may
         * have been added after the dialog was opened.
         */
        const generatedSKU =
          generateSKU(
            data.name,
            components
          );

        if (!generatedSKU) {
          setError(
            "Please enter a valid component name."
          );

          throw new Error(
            "Invalid component name"
          );
        }

        /*
         * Final duplicate check.
         */
        if (
          skuExists(
            generatedSKU,
            components
          )
        ) {
          setError(
            `SKU ${generatedSKU} already exists. Please try again.`
          );

          throw new Error(
            "Duplicate SKU"
          );
        }

        /*
         * Make sure the data going to the backend
         * contains the generated SKU.
         */
        const saveData = {
          ...data,
          sku: generatedSKU,
        };

        const response =
          await componentApi.create(
            saveData,
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
       * =================================================
       * UPDATE
       * =================================================
       */

      else if (editing?._id) {
        /*
         * For editing, generate the SKU from the
         * component name.
         */
        const generatedSKU =
          generateSKU(
            data.name,
            components,
            editing._id
          );

        if (!generatedSKU) {
          setError(
            "Please enter a valid component name."
          );

          throw new Error(
            "Invalid component name"
          );
        }

        /*
         * Check duplicate SKU.
         */
        if (
          skuExists(
            generatedSKU,
            components,
            editing._id
          )
        ) {
          setError(
            `SKU ${generatedSKU} already exists.`
          );

          throw new Error(
            "Duplicate SKU"
          );
        }

        const saveData = {
          ...data,
          sku: generatedSKU,
        };

        const response =
          await componentApi.update(
            editing._id,
            saveData,
            imageFile
          );

        console.log(
          "Updated component:",
          response
        );

        setComponents((prev) =>
          prev.map((component) =>
            component._id ===
            editing._id
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

      /*
       * Don't replace our own duplicate/validation
       * message with a generic error.
       */
      if (
        error?.message !==
          "Duplicate SKU" &&
        error?.message !==
          "Invalid component name"
      ) {
        setError(
          error?.message ||
            "Failed to save component"
        );
      }

      throw error;
    }
  };

  /*
   * =====================================================
   * DELETE COMPONENT
   * =====================================================
   */

  const handleDelete = async (
    component: BackendComponent
  ) => {
    if (!component._id) return;

    const confirmed =
      window.confirm(
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
    <div className="min-h-screen bg-slate-950 p-5 sm:p-8 lg:p-10">

      {/* =================================================
          HEADER
          ================================================= */}

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
                Manage your hardware
                components, stock and
                product information.
              </p>
            </div>

          </div>
        </div>

        <button
          onClick={() =>
            setEditing("new")
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-accent px-5 font-semibold text-white shadow-lg shadow-brand-accent/10 transition hover:scale-[1.02] hover:bg-blue-600 active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Add component
        </button>

      </div>

      {/* =================================================
          STATISTICS
          ================================================= */}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={
            <Boxes className="size-5" />
          }
          label="Total components"
          value={components.length}
        />

        <StatCard
          icon={
            <Package className="size-5" />
          }
          label="Total stock"
          value={totalStock}
        />

        <StatCard
          icon={
            <AlertTriangle className="size-5" />
          }
          label="Low stock"
          value={lowStock}
        />

        <StatCard
          icon={
            <Trash2 className="size-5" />
          }
          label="Out of stock"
          value={outOfStock}
        />

      </div>

      {/* =================================================
          ERROR
          ================================================= */}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -5,
            }}
            className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertTriangle className="size-4" />

            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================
          SEARCH
          ================================================= */}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">

        <div className="relative flex-1">

          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search products, SKU or category..."
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
          />

        </div>

        <div className="flex h-12 items-center rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-slate-400">

          <span>
            {filteredComponents.length}
          </span>

          <span className="ml-1">
            {filteredComponents.length ===
            1
              ? "product"
              : "products"}
          </span>

        </div>

      </div>

      {/* =================================================
          INVENTORY TABLE
          ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">

        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-4">

          <div>
            <h2 className="font-semibold text-white">
              Product inventory
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              All components added to the
              store.
            </p>
          </div>

          <div className="hidden text-xs text-slate-500 sm:block">
            {components.length} total
          </div>

        </div>

        {/* =================================================
            LOADING
            ================================================= */}

        {loading ? (
          <InventorySkeleton />
        ) : components.length ===
          0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">

            <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-white/5">
              <Package className="size-7 text-slate-600" />
            </div>

            <h3 className="text-lg font-semibold text-white">
              No components found
            </h3>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Add your first hardware
              component to start building
              your inventory.
            </p>

            <button
              onClick={() =>
                setEditing("new")
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
            >
              <Plus className="size-4" />
              Add component
            </button>

          </div>
        ) : filteredComponents.length ===
          0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">

            <Search className="mb-4 size-8 text-slate-600" />

            <h3 className="font-semibold text-white">
              No matching products
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try searching with another
              name, SKU or category.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px] text-sm">

              <thead className="bg-white/[0.03] text-xs uppercase tracking-widest text-slate-500">

                <tr>

                  <th className="px-5 py-4 text-left">
                    Product
                  </th>

                  <th className="px-5 py-4 text-left">
                    Category
                  </th>

                  <th className="px-5 py-4 text-left">
                    SKU
                  </th>

                  <th className="px-5 py-4 text-right">
                    Price
                  </th>

                  <th className="px-5 py-4 text-right">
                    Stock
                  </th>

                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredComponents.map(
                  (c, index) => (
                    <motion.tr
                      key={c._id}
                      initial={{
                        opacity: 0,
                        y: 5,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.025,
                      }}
                      className="border-t border-white/5 transition hover:bg-white/[0.025]"
                    >

                      {/* PRODUCT */}

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
                              {c.description ||
                                "No description available"}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* CATEGORY */}

                      <td className="px-5 py-4">

                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                          {c.category}
                        </span>

                      </td>

                      {/* SKU */}

                      <td className="px-5 py-4">

                        <span className="rounded-md bg-black/20 px-2 py-1 font-mono text-xs text-slate-400">
                          {c.sku}
                        </span>

                      </td>

                      {/* PRICE */}

                      <td className="px-5 py-4 text-right">

                        <span className="font-semibold text-white">
                          ₦
                          {Number(
                            c.price
                          ).toLocaleString()}
                        </span>

                      </td>

                      {/* STOCK */}

                      <td className="px-5 py-4 text-right">

                        <StockBadge
                          stock={Number(
                            c.stock
                          )}
                        />

                      </td>

                      {/* ACTIONS */}

                      <td className="px-5 py-4 text-right">

                        <div className="flex justify-end gap-1">

                          <button
                            onClick={() =>
                              setEditing(c)
                            }
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                            title="Edit component"
                          >
                            <Pencil className="size-4" />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(c)
                            }
                            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                            title="Delete component"
                          >
                            <Trash2 className="size-4" />
                          </button>

                        </div>

                      </td>

                    </motion.tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =================================================
          DIALOG
          ================================================= */}

      <AnimatePresence>
        {editing && (
          <ComponentDialog
            initial={
              editing === "new"
                ? null
                : editing
            }
            components={components}
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
 * =====================================================
 * STAT CARD
 * =====================================================
 */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="rounded-2xl border border-white/10 bg-slate-900 p-5"
    >

      <div className="flex items-center justify-between">

        <div className="grid size-10 place-items-center rounded-xl bg-white/5 text-slate-400">
          {icon}
        </div>

        <span className="text-2xl font-bold text-white">
          {value.toLocaleString()}
        </span>

      </div>

      <p className="mt-4 text-xs uppercase tracking-widest text-slate-500">
        {label}
      </p>

    </motion.div>
  );
}

/*
 * =====================================================
 * STOCK BADGE
 * =====================================================
 */

function StockBadge({
  stock,
}: {
  stock: number;
}) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
        Out of stock
      </span>
    );
  }

  if (stock < 10) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
        {stock} low
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
      {stock} available
    </span>
  );
}

/*
 * =====================================================
 * LOADING SKELETON
 * =====================================================
 */

function InventorySkeleton() {
  return (
    <div className="relative overflow-hidden">

      <div className="pointer-events-none absolute inset-0 z-10 backdrop-blur-[2px]" />

      <div className="animate-pulse">

        {Array.from({
          length: 7,
        }).map((_, index) => (
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

/*
 * =====================================================
 * COMPONENT DIALOG
 * =====================================================
 */

function ComponentDialog({
  initial,
  components,
  onClose,
  onSave,
}: {
  initial: BackendComponent | null;

  components: BackendComponent[];

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
            category:
              initial.category,
            price: initial.price,
            stock: initial.stock,
            description:
              initial.description ||
              "",
            details:
              initial.details ||
              "",
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
   * =====================================================
   * AUTOMATIC SKU
   * =====================================================
   */

  const generatedSKU = useMemo(() => {
    return generateSKU(
      c.name,
      components,
      initial?._id
    );
  }, [
    c.name,
    components,
    initial?._id,
  ]);

  /*
   * Update SKU automatically whenever
   * the component name changes.
   */

  useEffect(() => {
    if (!c.name.trim()) {
      setC((prev) => ({
        ...prev,
        sku: "",
      }));

      return;
    }

    setC((prev) => ({
      ...prev,
      sku: generatedSKU,
    }));
  }, [generatedSKU]);

  /*
   * =====================================================
   * IMAGE SELECT
   * =====================================================
   */

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        "Image must be less than 5MB."
      );

      return;
    }

    setImageFile(file);

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
   * =====================================================
   * SUBMIT
   * =====================================================
   */

  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    /*
     * Name is required.
     */
    if (!c.name.trim()) {
      alert(
        "Please enter the component name."
      );

      return;
    }

    /*
     * Generate a final SKU immediately
     * before sending.
     */
    const finalSKU =
      generateSKU(
        c.name,
        components,
        initial?._id
      );

    if (!finalSKU) {
      alert(
        "Unable to generate SKU. Please check the component name."
      );

      return;
    }

    /*
     * Check duplicate SKU.
     */
    if (
      skuExists(
        finalSKU,
        components,
        initial?._id
      )
    ) {
      alert(
        `SKU ${finalSKU} already exists.`
      );

      return;
    }

    try {
      setSaving(true);

      await onSave({
        data: {
          ...c,
          sku: finalSKU,
        },
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
   * =====================================================
   * CLEANUP IMAGE PREVIEW
   * =====================================================
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

  /*
   * =====================================================
   * DIALOG
   * =====================================================
   */

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
    >

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
          y: 15,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.96,
          y: 15,
        }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
      >

        {/* =================================================
            HEADER
            ================================================= */}

        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

          <div>

            <h2 className="text-xl font-bold text-white">
              {initial
                ? "Edit component"
                : "New component"}
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

        {/* =================================================
            FORM
            ================================================= */}

        <form
          onSubmit={submit}
          className="max-h-[80vh] overflow-y-auto p-6"
        >

          {/* =================================================
              NAME + SKU
              ================================================= */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* NAME */}

            <label className="block">

              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Name
              </span>

              <input
                type="text"
                value={c.name}
                onChange={(e) =>
                  setC({
                    ...c,
                    name: e.target.value,
                  })
                }
                required
                autoFocus
                placeholder="e.g. Wire"
                className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
              />

            </label>

            {/* SKU */}

            <label className="block">

              <div className="flex items-center justify-between">

                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  SKU
                </span>

                {c.name.trim() &&
                  c.sku && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="size-3" />
                      Auto-generated
                    </span>
                  )}

              </div>

              <div className="relative">

                <input
                  type="text"
                  value={c.sku}
                  readOnly
                  placeholder="WIR-0001"
                  className="mt-1 h-11 w-full cursor-not-allowed rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-sm font-semibold tracking-wide text-brand-accent outline-none"
                />

              </div>

              <p className="mt-1.5 text-[10px] text-slate-600">
                SKU is automatically generated
                from the component name.
              </p>

            </label>

          </div>

          {/* =================================================
              CATEGORY + PRICE + STOCK
              ================================================= */}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

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
                className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
              >

                {CATS.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}

              </select>

            </label>

            {/* PRICE */}

            <Inp
              label="Price (₦)"
              type="number"
              value={String(
                c.price
              )}
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
              value={String(
                c.stock
              )}
              onChange={(v) =>
                setC({
                  ...c,
                  stock:
                    Number(v) || 0,
                })
              }
            />

          </div>

          {/* =================================================
              IMAGE
              ================================================= */}

          <div className="mt-4">

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

            {imagePreview && (
              <div className="mt-4">

                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  Preview
                </p>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">

                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-40 w-full object-contain"
                  />

                </div>

              </div>
            )}

          </div>

          {/* =================================================
              DESCRIPTION
              ================================================= */}

          <div className="mt-4">

            <Inp
              label="Short description"
              value={
                c.description
              }
              onChange={(v) =>
                setC({
                  ...c,
                  description: v,
                })
              }
            />

          </div>

          {/* =================================================
              DETAILS
              ================================================= */}

          <label className="mt-4 block">

            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Detailed specs
            </span>

            <textarea
              rows={5}
              value={c.details}
              onChange={(e) =>
                setC({
                  ...c,
                  details:
                    e.target.value,
                })
              }
              placeholder="Enter detailed specifications..."
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
            />

          </label>

          {/* =================================================
              BUTTONS
              ================================================= */}

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
              disabled={
                saving ||
                !c.name.trim() ||
                !c.sku
              }
              className="flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}

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

/*
 * =====================================================
 * INPUT
 * =====================================================
 */

function Inp({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
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
          onChange(
            e.target.value
          )
        }
        required
        min={
          type === "number"
            ? "0"
            : undefined
        }
        className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/20"
      />

    </label>
  );
}

export default AdminComponents;