import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ComponentCard } from "@/components/ComponentCard";
import { RequireAuth } from "@/components/RequireAuth";

import type {
  Category,
  Component,
} from "@/lib/data";

import { socket } from "@/lib/socket";

import {
  componentsCache,
  loadComponents,
  normalizeComponent,
  setComponentsCache,
} from "@/lib/componentStore";

export const Route = createFileRoute("/components")({
  head: () => ({
    meta: [
      {
        title: "Components — PulseLab",
      },
    ],
  }),

  component: () => (
    <RequireAuth role="student">
      <ComponentsLayout />
    </RequireAuth>
  ),
});

function ComponentsLayout() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (pathname !== "/components") {
    return <Outlet />;
  }

  return <CatalogIndex />;
}

const CATEGORIES: (Category | "All")[] = [
  "All",
  "Microcontroller",
  "Sensors",
  "Prototyping",
  "Passive",
  "Power",
  "Connector",
];

const SORTS = [
  {
    id: "popular",
    label: "Most stocked",
  },
  {
    id: "price-asc",
    label: "Price: low to high",
  },
  {
    id: "price-desc",
    label: "Price: high to low",
  },
] as const;

type BackendComponent = {
  _id?: string;
  sku: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
  details: string;
  image?: string;
};

function CatalogIndex() {
  /*
   * =====================================================
   * COMPONENTS
   * =====================================================
   *
   * Start immediately with whatever is already inside
   * componentStore.
   *
   * There is NO localStorage here.
   */

  const [components, setComponents] =
    useState<Component[]>(() => componentsCache);

  const [error, setError] = useState("");

  const [q, setQ] = useState("");

  const [cat, setCat] =
    useState<(typeof CATEGORIES)[number]>("All");

  const [sort, setSort] =
    useState<(typeof SORTS)[number]["id"]>("popular");

  /*
   * =====================================================
   * LOAD COMPONENTS
   * =====================================================
   *
   * loadComponents() uses the componentStore cache.
   *
   * If data already exists:
   *     it returns it immediately.
   *
   * If data does not exist:
   *     it fetches from backend once.
   */

  useEffect(() => {
    let mounted = true;

    loadComponents()
      .then((data) => {
        if (!mounted) return;

        setComponents(data);
      })
      .catch((error: any) => {
        if (!mounted) return;

        console.error(
          "Failed to fetch components:",
          error
        );

        setError(
          error?.message ||
            "Failed to load components"
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * =====================================================
   * SOCKET.IO
   * =====================================================
   *
   * Admin changes update the page immediately.
   */

  useEffect(() => {
    console.log(
      "Connecting to component realtime events..."
    );

    /*
     * =================================================
     * CREATED
     * =================================================
     */

    const handleCreated = (
      component: BackendComponent
    ) => {
      console.log(
        "Component created:",
        component
      );

      const normalized =
        normalizeComponent(component);

      setComponents((current) => {
        /*
         * Prevent duplicate component.
         */

        const exists = current.some(
          (item) =>
            item.id === normalized.id
        );

        if (exists) {
          return current;
        }

        const updated = [
          normalized,
          ...current,
        ];

        /*
         * Update shared store.
         */

        setComponentsCache(updated);

        return updated;
      });
    };

    /*
     * =================================================
     * UPDATED
     * =================================================
     */

    const handleUpdated = (
      component: BackendComponent
    ) => {
      console.log(
        "Component updated:",
        component
      );

      const normalized =
        normalizeComponent(component);

      setComponents((current) => {
        const updated = current.map(
          (item) =>
            item.id === normalized.id
              ? normalized
              : item
        );

        setComponentsCache(updated);

        return updated;
      });
    };

    /*
     * =================================================
     * DELETED
     * =================================================
     */

    const handleDeleted = (
      component: BackendComponent
    ) => {
      console.log(
        "Component deleted:",
        component
      );

      const id = component._id;

      if (!id) return;

      setComponents((current) => {
        const updated = current.filter(
          (item) => item.id !== id
        );

        setComponentsCache(updated);

        return updated;
      });
    };

    /*
     * =================================================
     * SOCKET LISTENERS
     * =================================================
     */

    socket.on(
      "component:created",
      handleCreated
    );

    socket.on(
      "component:updated",
      handleUpdated
    );

    socket.on(
      "component:deleted",
      handleDeleted
    );

    /*
     * =================================================
     * CLEANUP
     * =================================================
     */

    return () => {
      socket.off(
        "component:created",
        handleCreated
      );

      socket.off(
        "component:updated",
        handleUpdated
      );

      socket.off(
        "component:deleted",
        handleDeleted
      );
    };
  }, []);

  /*
   * =====================================================
   * FILTER + SEARCH + SORT
   * =====================================================
   */

  const filtered = useMemo(() => {
    let result = components.filter(
      (component) => {
        const matchesCategory =
          cat === "All" ||
          component.category === cat;

        const search =
          q.trim().toLowerCase();

        const matchesSearch =
          search === "" ||
          (
            component.name +
            " " +
            component.description +
            " " +
            component.sku
          )
            .toLowerCase()
            .includes(search);

        return (
          matchesCategory &&
          matchesSearch
        );
      }
    );

    /*
     * PRICE LOW → HIGH
     */

    if (sort === "price-asc") {
      result = [...result].sort(
        (a, b) =>
          a.price - b.price
      );
    }

    /*
     * PRICE HIGH → LOW
     */

    if (sort === "price-desc") {
      result = [...result].sort(
        (a, b) =>
          b.price - a.price
      );
    }

    /*
     * MOST STOCKED
     */

    if (sort === "popular") {
      result = [...result].sort(
        (a, b) =>
          b.stock - a.stock
      );
    }

    return result;
  }, [
    components,
    q,
    cat,
    sort,
  ]);

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* HEADER */}

        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-brand-navy">
            Component Catalog
          </h1>

          <p className="text-slate-500 mt-2">
            {components.length} item
            {components.length !== 1 && "s"} available.
          </p>
        </motion.div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-600">
            {error}
          </div>
        )}

        {/* SEARCH + SORT */}

        <div className="flex flex-col md:flex-row gap-4 mb-8">

          <input
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
            placeholder="Search components, SKUs..."
            className="flex-1 h-11 px-4 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />

          <select
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value as typeof sort
              )
            }
            className="h-11 px-3 rounded-lg border border-slate-200 bg-white"
          >
            {SORTS.map((s) => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.label}
              </option>
            ))}
          </select>

        </div>

        {/* CATEGORIES */}

        <div className="flex flex-wrap gap-2 mb-10">

          {CATEGORIES.map(
            (category) => (
              <button
                key={category}
                onClick={() =>
                  setCat(category)
                }
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  cat === category
                    ? "bg-brand-navy text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {category}
              </button>
            )
          )}

        </div>

        {/* =================================================
            PRODUCTS
            ================================================= */}

        {filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {filtered.map(
              (component, index) => (
                <ComponentCard
                  key={
                    component.id ??
                    component._id
                  }
                  c={component}
                  index={index}
                />
              )
            )}

          </div>
        )}

      </div>
    </AppShell>
  );
}