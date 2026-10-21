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

import { useCartMutations, useCartQuery } from "@/hooks/useCartQuery";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

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
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md ring-1 ${config.ring}"
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
  // CART
  // ===================================================
  // Every card on the page reads the same query key, so the cart is
  // requested exactly once no matter how many cards are rendered.
  const queryClient = useQueryClient();
  const { cart, isLoading: cartLoading } = useCartQuery();
  const {
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCartMutations();

  const quantity =
    cart.items.find((item) => item.componentId === componentId)?.quantity ?? 0;

  const isMutating =
    addToCart.isPending ||
    updateQuantity.isPending ||
    removeFromCart.isPending;

  // Guests can browse the catalog without any cart request.
  const cartReady = !cartLoading;

  const [loading, setLoading] = useState(false);

  const getToken = () => {
    return sessionStorage.getItem("pulselab_token");
  };

  if (!componentId) {
    console.error("Component ID is missing:", c);
  }

  // ===================================================
  // REAL-TIME CART UPDATE
  // ===================================================
  // The backend pushes a fresh cart after an add and after a payment
  // webhook. Invalidate the shared query so every card re-reads it.
  useEffect(() => {
    const handleCartUpdated = (cart: any) => {
      if (!sessionStorage.getItem("pulselab_token")) return;

      // Ignore a queued event that belongs to another user.
      const currentUserId = sessionStorage.getItem("pulselab_userId");
      const rawUserId = cart?.userId;
      const eventUserId =
        rawUserId && typeof rawUserId === "object"
          ? rawUserId._id ?? rawUserId.id
          : rawUserId;

      if (
        currentUserId &&
        eventUserId &&
        String(eventUserId) !== currentUserId
      ) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    };

    socket.on("cart:updated", handleCartUpdated);

    return () => {
      socket.off("cart:updated", handleCartUpdated);
    };
  }, [queryClient]);

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

    setLoading(true);

    try {
      await addToCart.mutateAsync({
        componentId,
        quantity: 1,
        component: c,
      });

      pushToast("success", `${c.name} added to cart`);
    } catch (error: any) {
      console.error("Add to cart error:", error);

      pushToast(
        "error",
        error?.message || "Failed to add item to cart"
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
        `Only ${c.stock} unit${c.stock === 1 ? "" : "s"} available for ${c.name}.`
      );
      return;
    }

    setLoading(true);

    try {
      await updateQuantity.mutateAsync({
        componentId,
        quantity: quantity + 1,
      });
    } catch (error: any) {
      console.error("Increase quantity error:", error);

      pushToast(
        "error",
        error?.message || "Failed to increase quantity"
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

    const isRemoving = quantity === 1;

    setLoading(true);

    try {
      if (isRemoving) {
        await removeFromCart.mutateAsync({ componentId });

        pushToast("info", `${c.name} removed from cart`);
        return;
      }

      await updateQuantity.mutateAsync({
        componentId,
        quantity: quantity - 1,
      });
    } catch (error: any) {
      console.error("Decrease quantity error:", error);

      pushToast(
        "error",
        error?.message || "Failed to decrease quantity"
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
            disabled={isOutOfStock || !componentId || isMutating}
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
              disabled={loading || isMutating}
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
              disabled={loading || isMutating}
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
