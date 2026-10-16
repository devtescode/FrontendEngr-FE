import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ShoppingCart,
  ArrowUpRight,
  Minus,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { BackendComponent } from "@/lib/api";
import { socket } from "@/lib/socket";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

// =====================================================
// TYPES
// =====================================================

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

// =====================================================
// GLOBAL CART CACHE
// =====================================================

type CachedCartItem = {
  componentId: string;
  quantity: number;
};

export const cartCache: {
  items: CachedCartItem[];
  loaded: boolean;
} = {
  items: [],
  loaded: false,
};

/**
 * Extract the cart items array from any of the shapes
 * the backend might return:
 *   { items: [...] }
 *   { cart: { items: [...] } }
 *   [...]
 */
function extractItems(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items;
  if (data.cart && Array.isArray(data.cart.items)) {
    return data.cart.items;
  }
  if (Array.isArray(data)) return data;
  return [];
}

export function setCartCacheFromResponse(cart: any) {
  const rawItems = extractItems(cart);
  const items: CachedCartItem[] = [];

  for (const it of rawItems) {
    const id =
      typeof it.componentId === "object"
        ? it.componentId?._id
        : it.componentId;

    if (id) {
      items.push({
        componentId: String(id),
        quantity: Number(it.quantity) || 0,
      });
    }
  }

  cartCache.items = items;
  cartCache.loaded = true;
}

export function getCachedQuantity(
  componentId: string | undefined
): number {
  if (!componentId) return 0;

  const found = cartCache.items.find(
    (it) => it.componentId === String(componentId)
  );

  return found?.quantity ?? 0;
}

export function resetCartCache() {
  cartCache.items = [];
  cartCache.loaded = false;
}

// =====================================================
// GLOBAL TOAST BUS
// =====================================================

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function emitToasts() {
  toastListeners.forEach((fn) => fn([...toasts]));
}

export function pushToast(kind: ToastKind, message: string) {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  toasts = [...toasts, { id, kind, message }].slice(-3);
  emitToasts();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitToasts();
  }, 4000);
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}

export function ToastHost() {
  const [list, setList] = useState<Toast[]>([]);

  useEffect(() => {
    const fn = (next: Toast[]) => setList(next);
    toastListeners.push(fn);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== fn);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[70] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {list.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
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
      icon: AlertCircle,
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
// COMPONENT CARD
// =====================================================

export function ComponentCard({
  c,
  index = 0,
}: {
  c: BackendComponent;
  index?: number;
}) {
  const isOutOfStock = c.stock <= 0;
  const isLowStock = c.stock > 0 && c.stock <= 5;

  const componentId = c._id;

  // ===================================================
  // CART READY GATE
  // ===================================================
  const [cartReady, setCartReady] = useState(cartCache.loaded);

  const [quantity, setQuantity] = useState(() =>
    getCachedQuantity(componentId)
  );
  const [loading, setLoading] = useState(false);

  const getToken = () => {
    return sessionStorage.getItem("pulselab_token");
  };

  // ===================================================
  // SYNC LOCAL QUANTITY INTO CACHE
  // ===================================================
  const syncCache = (nextQuantity: number) => {
    if (!componentId) return;

    const id = String(componentId);
    const existing = cartCache.items.find(
      (it) => it.componentId === id
    );

    if (nextQuantity === 0) {
      cartCache.items = cartCache.items.filter(
        (it) => it.componentId !== id
      );
      return;
    }

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cartCache.items.push({
        componentId: id,
        quantity: nextQuantity,
      });
    }
  };

  // ===================================================
  // APPLY SERVER RESPONSE TO CACHE
  // ===================================================
  // Handles any response shape the backend returns
  // ({ items }, { cart: { items } }, or [...]) and
  // updates the local quantity accordingly.
  //
  const applyServerResponse = (data: any) => {
    const rawItems = extractItems(data);

    // If the server returned a payload with items,
    // refresh the whole cache from it.
    if (rawItems.length > 0 || Array.isArray(data?.items) || Array.isArray(data?.cart?.items)) {
      setCartCacheFromResponse(data);
      setQuantity(getCachedQuantity(componentId));
    }
  };

  // ===================================================
  // INITIAL LOAD
  // ===================================================
  // ALWAYS refetch the cart on mount, even if the
  // cache is loaded. This is what ensures that a cart
  // change made elsewhere (e.g. on /cart) is reflected
  // the moment we navigate back to /components.
  //
  useEffect(() => {
    let cancelled = false;

    const loadCart = async () => {
      const token = sessionStorage.getItem("pulselab_token");

      if (!token || !componentId) {
        setCartReady(true);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/engineering/cart`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load cart");
        }

        const cart = await response.json();

        if (cancelled) return;

        setCartCacheFromResponse(cart);
        setQuantity(getCachedQuantity(componentId));
        setCartReady(true);
      } catch (error) {
        console.error(
          "Failed to restore cart quantity:",
          error
        );
        if (!cancelled) setCartReady(true);
      }
    };

    loadCart();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId]);

  if (!componentId) {
    console.error("Component ID is missing:", c);
  }

  // ===================================================
  // REAL-TIME CART UPDATE
  // ===================================================
  useEffect(() => {
    const handleCartUpdated = (cart: any) => {
      setCartCacheFromResponse(cart);
      setQuantity(getCachedQuantity(componentId));
      setCartReady(true);
    };

    socket.on("cart:updated", handleCartUpdated);

    return () => {
      socket.off("cart:updated", handleCartUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId]);

  // ===================================================
  // ADD TO CART (optimistic)
  // ===================================================
  const handleAddToCart = async () => {
    const token = getToken();

    if (!token) {
      pushToast("error", "Please login first.");
      return;
    }

    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    if (isOutOfStock) return;

    const previousQuantity = quantity;
    setQuantity(1);
    syncCache(1);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/engineering/addtocart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            componentId: componentId,
            quantity: 1,
          }),
        }
      );

      const data = await response.json();
      console.log("ADD TO CART RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to add item to cart"
        );
      }

      applyServerResponse(data);
      pushToast("success", `${c.name} added to cart`);
    } catch (error: any) {
      console.error("Add to cart error:", error);

      setQuantity(previousQuantity);
      syncCache(previousQuantity);

      pushToast(
        "error",
        error.message || "Failed to add item to cart"
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // INCREASE (optimistic + stock guard)
  // ===================================================
  const handleIncrease = async () => {
    const token = getToken();

    if (!token) {
      pushToast("error", "Please login first.");
      return;
    }

    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    if (quantity >= c.stock) {
      pushToast(
        "error",
        `Only ${c.stock} unit${
          c.stock === 1 ? "" : "s"
        } available for ${c.name}.`
      );
      return;
    }

    const previousQuantity = quantity;
    const nextQuantity = previousQuantity + 1;

    setQuantity(nextQuantity);
    syncCache(nextQuantity);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/engineering/addtocart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            componentId: componentId,
            quantity: 1,
          }),
        }
      );

      const data = await response.json();
      console.log("INCREASE RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to increase quantity"
        );
      }

      applyServerResponse(data);
    } catch (error: any) {
      console.error("Increase quantity error:", error);

      setQuantity(previousQuantity);
      syncCache(previousQuantity);

      pushToast(
        "error",
        error.message || "Failed to increase quantity"
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // DECREASE (optimistic)
  // ===================================================
  const handleDecrease = async () => {
    const token = getToken();

    if (!token) {
      pushToast("error", "Please login first.");
      return;
    }

    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    if (quantity <= 0) return;

    const previousQuantity = quantity;
    const isRemoving = previousQuantity === 1;
    const nextQuantity = isRemoving ? 0 : previousQuantity - 1;

    setQuantity(nextQuantity);
    syncCache(nextQuantity);
    setLoading(true);

    try {
      if (isRemoving) {
        const response = await fetch(
          `${API_URL}/engineering/cart/${componentId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        console.log("REMOVE CART RESPONSE:", data);

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to remove item"
          );
        }

        applyServerResponse(data);
        pushToast("info", `${c.name} removed from cart`);
        return;
      }

      const response = await fetch(
        `${API_URL}/engineering/cart/${componentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: nextQuantity,
          }),
        }
      );

      const data = await response.json();
      console.log("DECREASE RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to decrease quantity"
        );
      }

      applyServerResponse(data);
    } catch (error: any) {
      console.error("Decrease quantity error:", error);

      setQuantity(previousQuantity);
      syncCache(previousQuantity);

      pushToast(
        "error",
        error.message || "Failed to decrease quantity"
      );
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // UI
  // ===================================================
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
    >
      {/* IMAGE */}
      <div className="relative h-66 overflow-hidden bg-slate-50">
        {c.image ? (
          <img
            src={c.image}
            alt={c.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
            <Package className="mb-2 h-12 w-12" strokeWidth={1.5} />
            <span className="text-sm">No image available</span>
          </div>
        )}

        {/* CATEGORY */}
        <div className="absolute left-4 top-4">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            {c.category}
          </span>
        </div>

        {/* STOCK */}
        <div className="absolute right-4 top-4">
          {isOutOfStock ? (
            <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Out of stock
            </span>
          ) : isLowStock ? (
            <span className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Only {c.stock} left
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              In stock
            </span>
          )}
        </div>

        {/* VIEW */}
        <button
          type="button"
          className="absolute bottom-4 right-4 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-white text-slate-700 opacity-0 shadow-md transition-all duration-300 hover:bg-brand-navy hover:text-white group-hover:translate-y-0 group-hover:opacity-100"
          aria-label={`View ${c.name}`}
        >
          <ArrowUpRight className="h-5 w-5" />
        </button>
      </div>

      {/* CONTENT */}
      <div className="mx-2 mb-4 mt-3 p-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          SKU: {c.sku}
        </p>

        <h3 className="line-clamp-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-brand-navy">
          {c.name}
        </h3>

        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
          {c.description}
        </p>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">Price</p>
            <p className="mt-1 text-xl font-bold text-brand-navy">
              ₦{c.price.toLocaleString("en-NG")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">
              Available
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                isOutOfStock
                  ? "text-red-500"
                  : isLowStock
                    ? "text-amber-600"
                    : "text-emerald-600"
              }`}
            >
              {c.stock} units
            </p>
          </div>
        </div>

        {/* CART ACTION */}
        {!cartReady ? (
          <div className="mt-5 h-12 w-full animate-pulse rounded-xl bg-slate-100" />
        ) : quantity === 0 ? (
          <button
            type="button"
            disabled={isOutOfStock || !componentId}
            onClick={handleAddToCart}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-navy/90 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
        ) : (
          <div className="mt-5 flex h-12 w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              disabled={loading}
              onClick={handleDecrease}
              className="flex h-full w-14 items-center justify-center text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-base font-bold text-brand-navy">
                {quantity}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                In cart
              </span>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleIncrease}
              className="flex h-full w-14 items-center justify-center text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}