import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  ShoppingCart,
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

import { API_BASE_URL } from "@/lib/config";
const API_URL = API_BASE_URL;

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

const isObjCC = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const toStrCC = (v: unknown, fb = "") => {
  if (v == null) return fb;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (isObjCC(v)) {
    if (v._id != null) return String(v._id);
    if (v.id != null) return String(v.id);
  }
  return String(v);
};
const toNumCC = (v: unknown, fb = 0) => {
  if (v == null) return fb;
  if (typeof v === "number") return Number.isFinite(v) ? v : fb;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
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
  if (isObjCC(data.cart) && Array.isArray(data.cart.items)) {
    return data.cart.items;
  }
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * Only replace the shared cache when the payload is a real cart snapshot.
 * Unknown socket/message shapes must not wipe every card's quantity.
 */
function hasCartShape(data: any): boolean {
  if (!data) return false;
  if (Array.isArray(data)) return true;
  if (Array.isArray(data.items)) return true;
  return isObjCC(data.cart) && Array.isArray(data.cart.items);
}

export function setCartCacheFromResponse(cart: any) {
  const rawItems = extractItems(cart);
  const items: CachedCartItem[] = [];

  for (const it of rawItems) {
    if (!isObjCC(it)) continue;
    const comp = it.componentId;
    let id: unknown = comp;
    if (isObjCC(comp)) {
      id = comp._id ?? comp.id ?? comp.componentId;
    }
    const idStr = toStrCC(id, "");
    if (!idStr) continue;
    const qty = toNumCC(it.quantity ?? it.qty ?? it.count ?? 0, 0);
    if (qty <= 0) continue;
    items.push({
      componentId: idStr,
      quantity: qty,
    });
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

// =====================================================
// SHARED CART LOADER
// =====================================================
// Every ComponentCard used to request /engineering/cart
// on mount. On a page with six cards that meant six
// identical requests. This loader deduplicates them into
// one request per session (or per explicit reset).
//
let cartLoadPromise: Promise<void> | null = null;
let cartGeneration = 0;
let activeCartAbort: AbortController | null = null;

export function resetCartCache() {
  cartGeneration += 1;

  activeCartAbort?.abort();
  activeCartAbort = null;

  cartCache.items = [];
  cartCache.loaded = false;
  cartLoadPromise = null;

  // The cart page keeps its own offline copy under this key. It must not
  // survive a user switch.
  try {
    localStorage.removeItem("pulselab_cart");
  } catch (error) {
    console.error("Failed to clear saved cart:", error);
  }
}

export async function ensureCartLoaded(): Promise<void> {
  if (cartCache.loaded) return;
  if (cartLoadPromise) return cartLoadPromise;

  const token = sessionStorage.getItem("pulselab_token");

  // Guests can browse the catalog without any cart request.
  if (!token) return;

  const generation = cartGeneration;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  const tracked: { promise: Promise<void> | null } = { promise: null };

  activeCartAbort = controller;

  const request = (async () => {
    const response = await fetch(`${API_URL}/engineering/cart`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Failed to load cart");
    }

    const cart = await response.json();

    // Ignore a response that belongs to a previous user/session.
    if (generation !== cartGeneration) return;

    setCartCacheFromResponse(cart);
  })()
    .catch((error) => {
      if ((error as { name?: string })?.name !== "AbortError") {
        console.error("Failed to restore cart:", error);
      }
    })
    .finally(() => {
      clearTimeout(timeoutId);

      if (activeCartAbort === controller) {
        activeCartAbort = null;
      }

      // Don't let an old request clear a newer in-flight request.
      if (cartLoadPromise === tracked.promise) {
        cartLoadPromise = null;
      }
    });

  tracked.promise = request;
  cartLoadPromise = request;

  return request;
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

  // The backend normally returns `_id`, but accepting `id` too keeps cached
  // and socket-normalized components working in the public catalog.
  const componentId = c._id ?? c.id;

  // ===================================================
  // CART READY GATE
  // ===================================================
  // Guests must never wait on a cart request before a card can render. For
  // signed-in users the shared loader resolves the cart once for the page.
  const [cartReady, setCartReady] = useState(
    () =>
      cartCache.loaded ||
      typeof window === "undefined" ||
      !sessionStorage.getItem("pulselab_token")
  );

  const [quantity, setQuantity] = useState(() =>
    getCachedQuantity(componentId)
  );
  const [loading, setLoading] = useState(false);

  const getToken = () => {
    return sessionStorage.getItem("pulselab_token");
  };

  const sessionStillCurrent = (generation: number, requestToken: string) =>
    generation === cartGeneration && getToken() === requestToken;

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
    // If the server returned a real cart snapshot, refresh the whole cache.
    if (hasCartShape(data)) {
      setCartCacheFromResponse(data);
      setQuantity(getCachedQuantity(componentId));
    }
  };

  // ===================================================
  // INITIAL LOAD
  // ===================================================
  // One shared request fills the cache for every card.
  // Cart changes from the catalog, cart page, or socket
  // events update the same cache afterwards.
  //
  useEffect(() => {
    let cancelled = false;

    if (!componentId) {
      setCartReady(true);
      return;
    }

    void ensureCartLoaded()
      .then(() => {
        if (cancelled) return;

        setQuantity(getCachedQuantity(componentId));
        setCartReady(true);
      })
      .catch(() => {
        // A storage failure must never leave the card's action permanently
        // gated behind a skeleton.
        if (!cancelled) setCartReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [componentId]);

  if (!componentId) {
    console.error("Component ID is missing:", c);
  }

  // ===================================================
  // REAL-TIME CART UPDATE
  // ===================================================
  useEffect(() => {
    const handleCartUpdated = (cart: any) => {
      if (!sessionStorage.getItem("pulselab_token")) return;
      if (!hasCartShape(cart)) return;

      // Ignore a queued event that belongs to another user.
      const currentUserId = sessionStorage.getItem("pulselab_userId");
      const rawUserId = cart?.userId;
      const eventUserId = isObjCC(rawUserId)
        ? rawUserId._id ?? rawUserId.id
        : rawUserId;

      if (
        currentUserId &&
        eventUserId &&
        String(eventUserId) !== currentUserId
      ) {
        return;
      }

      setCartCacheFromResponse(cart);
      setQuantity(getCachedQuantity(componentId));
      setCartReady(true);
    };

    socket.on("cart:updated", handleCartUpdated);

    return () => {
      socket.off("cart:updated", handleCartUpdated);
    };
  }, [componentId]);

  // ===================================================
  // ADD TO CART (optimistic)
  // ===================================================
  const handleAddToCart = async () => {
    const token = getToken();

    if (!token) {
      pushToast("info", "Sign in to add items to your cart.");
      return;
    }

    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    if (isOutOfStock) return;

    const requestGeneration = cartGeneration;
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

      if (!sessionStillCurrent(requestGeneration, token)) return;

      applyServerResponse(data);
      pushToast("success", `${c.name} added to cart`);
    } catch (error: any) {
      console.error("Add to cart error:", error);

      if (!sessionStillCurrent(requestGeneration, token)) return;

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
      pushToast("info", "Sign in to add items to your cart.");
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

    const requestGeneration = cartGeneration;
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

      if (!sessionStillCurrent(requestGeneration, token)) return;

      applyServerResponse(data);
    } catch (error: any) {
      console.error("Increase quantity error:", error);

      if (!sessionStillCurrent(requestGeneration, token)) return;

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
      pushToast("info", "Sign in to add items to your cart.");
      return;
    }

    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    if (quantity <= 0) return;

    const requestGeneration = cartGeneration;
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

        if (!sessionStillCurrent(requestGeneration, token)) return;

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

      if (!sessionStillCurrent(requestGeneration, token)) return;

      applyServerResponse(data);
    } catch (error: any) {
      console.error("Decrease quantity error:", error);

      if (!sessionStillCurrent(requestGeneration, token)) return;

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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
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
      </div>

      {/* CONTENT */}
      <div className="mx-2 mb-4 mt-3 flex flex-1 flex-col p-2 pb-5">
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
          <div className="mt-auto h-12 w-full animate-pulse rounded-xl bg-slate-100" />
        ) : quantity === 0 ? (
          <button
            type="button"
            disabled={isOutOfStock || !componentId}
            onClick={handleAddToCart}
            className="mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-navy/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
        ) : (
          <div className="mt-auto flex h-12 w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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