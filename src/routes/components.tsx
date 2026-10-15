import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ComponentCard } from "@/components/ComponentCard";
import { RequireAuth } from "@/components/RequireAuth";

import type { Category, Component } from "@/lib/data";

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
  const [components, setComponents] = useState<Component[]>(
    () => componentsCache
  );

  const [error, setError] = useState("");

  const [q, setQ] = useState("");

  const [cat, setCat] =
    useState<(typeof CATEGORIES)[number]>("All");

  const [sort, setSort] =
    useState<(typeof SORTS)[number]["id"]>("popular");

  // Track socket connection status for a subtle live indicator
  const [isLive, setIsLive] = useState(socket.connected);

  // Prevent double socket setup in React StrictMode
  const socketSetupRef = useRef(false);

  // =====================================================
  // LOAD COMPONENTS
  // =====================================================
  useEffect(() => {
    let mounted = true;

    loadComponents()
      .then((data) => {
        if (!mounted) return;
        setComponents(data);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error("Failed to fetch components:", err);
        setError(err?.message || "Failed to load components");
      });

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // SOCKET.IO
  // =====================================================
  useEffect(() => {
    if (socketSetupRef.current) return;
    socketSetupRef.current = true;

    console.log("🔌 Component realtime events connected");

    // ---------------------------------------------------
    // CREATED
    // ---------------------------------------------------
    const handleCreated = (component: BackendComponent) => {
      console.log("🟢 Component created:", component);

      const normalized = normalizeComponent(component);

      setComponents((current) => {
        const exists = current.some(
          (item) => item.id === normalized.id
        );

        if (exists) return current;

        const updated = [normalized, ...current];
        setComponentsCache(updated);
        return updated;
      });
    };

    // ---------------------------------------------------
    // UPDATED (this fires when stock is reduced)
    // ---------------------------------------------------
    const handleUpdated = (component: BackendComponent) => {
      console.log("🟡 Component updated:", component);

      const normalized = normalizeComponent(component);

      setComponents((current) => {
        const exists = current.some(
          (item) => item.id === normalized.id
        );

        // If the component isn't in the list yet
        // (e.g., user is viewing a filtered view),
        // just add it.
        if (!exists) {
          const updated = [normalized, ...current];
          setComponentsCache(updated);
          return updated;
        }

        const updated = current.map((item) =>
          item.id === normalized.id ? normalized : item
        );

        setComponentsCache(updated);
        return updated;
      });
    };

    // ---------------------------------------------------
    // DELETED
    // ---------------------------------------------------
    const handleDeleted = (component: BackendComponent) => {
      console.log("🔴 Component deleted:", component);

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

    // ---------------------------------------------------
    // CONNECTION STATE (for the live indicator)
    // ---------------------------------------------------
    const handleConnect = () => {
      console.log("🟢 Socket connected");
      setIsLive(true);
    };

    const handleDisconnect = () => {
      console.log("🔴 Socket disconnected");
      setIsLive(false);
    };

    // ---------------------------------------------------
    // REGISTER LISTENERS
    // ---------------------------------------------------
    socket.on("component:created", handleCreated);
    socket.on("component:updated", handleUpdated);
    socket.on("component:deleted", handleDeleted);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Sync the live indicator with the actual socket state
    setIsLive(socket.connected);

    // ---------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------
    return () => {
      socket.off("component:created", handleCreated);
      socket.off("component:updated", handleUpdated);
      socket.off("component:deleted", handleDeleted);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socketSetupRef.current = false;
    };
  }, []);

  // =====================================================
  // FILTER + SEARCH + SORT
  // =====================================================
  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    let result = components.filter((component) => {
      const matchesCategory =
        cat === "All" || component.category === cat;

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

      return matchesCategory && matchesSearch;
    });

    if (sort === "price-asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    }

    if (sort === "price-desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    if (sort === "popular") {
      result = [...result].sort((a, b) => b.stock - a.stock);
    }

    return result;
  }, [components, q, cat, sort]);

  // =====================================================
  // UI
  // =====================================================
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-brand-navy">
              Component Catalog
            </h1>

            <p className="mt-2 text-slate-500">
              {components.length} item
              {components.length !== 1 && "s"} available.
            </p>
          </div>

          {/* LIVE INDICATOR */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <span
              className={`size-1.5 rounded-full ${
                isLive
                  ? "animate-pulse bg-emerald-500"
                  : "bg-slate-300"
              }`}
            />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {isLive ? "Live" : "Offline"}
            </span>
          </div>
        </motion.div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {error}
          </div>
        )}

        {/* SEARCH + SORT */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search components, SKUs..."
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white px-4 focus:border-brand-accent/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as typeof sort)
            }
            className="h-11 rounded-lg border border-slate-200 bg-white px-3"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* CATEGORIES */}
        <div className="mb-10 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setCat(category)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                cat === category
                  ? "bg-brand-navy text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filtered.length === 0 && components.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <p className="text-slate-500">
              No components match your search.
            </p>
            <button
              onClick={() => {
                setQ("");
                setCat("All");
              }}
              className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* PRODUCTS */}
        {filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((component, index) => (
              <ComponentCard
                key={component.id ?? component._id}
                c={component}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}