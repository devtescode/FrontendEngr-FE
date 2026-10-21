import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { socket } from "@/lib/socket";
import { RequireAuth } from "@/components/RequireAuth";
import { pushToast } from "@/components/ComponentCard";
import { useCartMutations, useCartQuery } from "@/hooks/useCartQuery";
import { queryKeys } from "@/lib/queryKeys";
import { toErrorMessage } from "@/lib/queryClient";
import { apiRequest } from "@/lib/apiClient";
import type { NormalizedCartItem } from "@/lib/normalize";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Cart — EU Hardwarestore" }],
  }),

  component: () => (
    <RequireAuth role="student">
      <CartPage />
    </RequireAuth>
  ),
});

// =====================================================
// TYPES
// =====================================================

type CartItem = NormalizedCartItem;

// =====================================================
// CART PAGE
// =====================================================

function CartPage() {
  const location = useLocation();
  const queryClient = useQueryClient();

  // The cart is server state: one shared query for the whole page.
  const { cart, isLoading: cartLoading } = useCartQuery();
  const {
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCartMutations();

  const [updating, setUpdating] = useState<string | null>(null);

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const getToken = () => sessionStorage.getItem("pulselab_token");

  // ===================================================
  // RESET PAYMENT STATE ON ROUTE CHANGE
  // ===================================================
  useEffect(() => {
    setIsRedirecting(false);
    setHasInitialized(false);
    sessionStorage.removeItem("pulselab_pending_reference");
  }, [location.pathname]);

  // ===================================================
  // REAL-TIME CART UPDATE
  // ===================================================
  // The backend pushes a fresh cart after an add and after a payment
  // webhook. Invalidating the shared query refreshes every consumer.
  useEffect(() => {
    const handleCartUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    };

    socket.on("cart:updated", handleCartUpdated);

    return () => {
      socket.off("cart:updated", handleCartUpdated);
    };
  }, [queryClient]);

  // ===================================================
  // REMOVE ITEM
  // ===================================================
  const removeItem = async (componentId: string) => {
    const token = getToken();
    if (!token) {
      pushToast("error", "Please login first.");
      return;
    }
    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    const name =
      cartItems.find((it) => it.componentId === componentId)?.component?.name ??
      "Item";

    try {
      setUpdating(componentId);

      await removeFromCart.mutateAsync({ componentId });

      pushToast("info", `${name} removed from cart`);
    } catch (error: unknown) {
      console.error("Remove cart item error:", error);
      pushToast(
        "error",
        toErrorMessage(error, "Failed to remove item")
      );
    } finally {
      setUpdating(null);
    }
  };

  // ===================================================
  // INCREASE QUANTITY
  // ===================================================
  const increaseQuantity = async (item: CartItem) => {
    const token = getToken();
    if (!token) {
      pushToast("error", "Please login first.");
      return;
    }

    const componentId = item.componentId;
    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    const stock = Number(item.component?.stock ?? 0);

    if (stock > 0 && item.quantity >= stock) {
      pushToast(
        "error",
        `Only ${stock} unit${stock === 1 ? "" : "s"} available.`
      );
      return;
    }

    try {
      setUpdating(componentId);

      await addToCart.mutateAsync({
        componentId,
        quantity: 1,
        component: item.component
          ? ({ ...item.component } as any)
          : undefined,
      });
    } catch (error: unknown) {
      console.error("Increase quantity error:", error);
      pushToast(
        "error",
        toErrorMessage(error, "Failed to increase quantity")
      );
    } finally {
      setUpdating(null);
    }
  };

  // ===================================================
  // DECREASE QUANTITY
  // ===================================================
  const decreaseQuantity = async (item: CartItem) => {
    const token = getToken();
    if (!token) {
      pushToast("error", "Please login first.");
      return;
    }

    const componentId = item.componentId;
    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    const name = item.component?.name ?? "Item";

    try {
      setUpdating(componentId);

      if (item.quantity <= 1) {
        await removeFromCart.mutateAsync({ componentId });

        pushToast("info", `${name} removed from cart`);
        return;
      }

      await updateQuantity.mutateAsync({
        componentId,
        quantity: item.quantity - 1,
      });
    } catch (error: unknown) {
      console.error("Decrease quantity error:", error);
      pushToast(
        "error",
        toErrorMessage(error, "Failed to decrease quantity")
      );
    } finally {
      setUpdating(null);
    }
  };

  // ===================================================
  // TOTAL PRICE
  // ===================================================
  const total = useMemo(() => {
    if (!Array.isArray(cart?.items)) return 0;

    return cart.items.reduce((sum, item) => {
      const price = Number(item?.component?.price ?? 0) || 0;
      const quantity = Number(item?.quantity ?? 0) || 0;
      if (!Number.isFinite(price) || !Number.isFinite(quantity)) return sum;
      return sum + price * quantity;
    }, 0);
  }, [cart]);

  // ===================================================
  // TOTAL QUANTITY
  // ===================================================
  const totalQuantity = useMemo(() => {
    if (!Array.isArray(cart?.items)) return 0;

    return cart.items.reduce((sum, item) => {
      const q = Number(item?.quantity ?? 0);
      return sum + (Number.isFinite(q) ? q : 0);
    }, 0);
  }, [cart]);

  // ===================================================
  // FORMAT NAIRA
  // ===================================================
  const formatNaira = (amount: number) =>
    `₦${amount.toLocaleString("en-NG")}`;

  // ===================================================
  // SAFE CART ITEMS
  // ===================================================
  const cartItems = Array.isArray(cart?.items) ? cart.items : [];

  // ===================================================
  // HANDLE CHECKOUT (PAYSTACK)
  // ===================================================
  const handleCheckout = async () => {
    if (isRedirecting || hasInitialized) return;

    setCheckoutError(null);

    const token = getToken();
    if (!token) {
      setCheckoutError("Please login first.");
      pushToast("error", "Please login first.");
      return;
    }

    if (!cartItems.length) {
      setCheckoutError("Your cart is empty.");
      pushToast("error", "Your cart is empty.");
      return;
    }

    setHasInitialized(true);
    setIsRedirecting(true);

    try {
      const data = await apiRequest<{
        authorizationUrl?: string;
        reference?: string;
      }>("/api/paystack/initialize", {
        method: "POST",
        auth: "user",
        headers: { "Content-Type": "application/json" },
      });

      if (!data?.authorizationUrl) {
        throw new Error("Unable to initialize payment");
      }

      if (data.reference) {
        sessionStorage.setItem(
          "pulselab_pending_reference",
          data.reference
        );
      }

      window.location.href = data.authorizationUrl;
    } catch (error: unknown) {
      const message = toErrorMessage(
        error,
        "Unable to start payment. Please try again."
      );
      setCheckoutError(message);
      pushToast("error", message);
      setIsRedirecting(false);
      setHasInitialized(false);
    }
  };

  // ===================================================
  // PAGE
  // ===================================================
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-navy">
            Your Cart
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {totalQuantity}{" "}
            {totalQuantity === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        {/* EMPTY CART */}
        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <ShoppingCart className="mx-auto mb-5 h-12 w-12 text-slate-300" />
            <h2 className="text-xl font-semibold text-brand-navy">
              Your cart is empty
            </h2>
            <p className="mt-2 text-slate-500">
              You haven't added any components yet.
            </p>
            <Link
              to="/components"
              className="mt-6 inline-block rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Browse components
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* CART ITEMS */}
            <div className="space-y-3 lg:col-span-2">
              <AnimatePresence mode="popLayout">
                {cartItems.map((item, index) => {
                  const component = item.component;

                  // The server only populates the component on some
                  // endpoints; without it there is nothing to render.
                  if (!component) return null;

                  const componentId = item.componentId;
                  if (!componentId) return null;

                  const isUpdating = updating === componentId;
                  const itemTotal =
                    (Number(component.price) || 0) *
                    (Number(item.quantity) || 0);

                  return (
                    <motion.div
                      key={`${componentId}-${index}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                    >
                      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">
                        {component.image ? (
                          <img
                            src={component.image}
                            alt={component.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-brand-navy">
                          {component.name}
                        </div>
                        <div className="mt-1 font-mono text-xs text-slate-500">
                          SKU: {component.sku}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {formatNaira(Number(component.price) || 0)} each
                        </div>
                      </div>

                      <div className="flex items-center self-start rounded-lg border border-slate-200 sm:self-auto">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => decreaseQuantity(item)}
                          className="grid size-9 place-items-center transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </button>

                        <span className="flex w-10 items-center justify-center text-sm font-semibold">
                          {isUpdating ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            item.quantity
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={
                            isUpdating ||
                            item.quantity >= component.stock
                          }
                          onClick={() => increaseQuantity(item)}
                          className="grid size-9 place-items-center transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <div className="w-full text-left font-bold text-brand-navy sm:w-28 sm:text-right">
                        {formatNaira(itemTotal)}
                      </div>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => removeItem(componentId)}
                        className="grid size-9 shrink-0 place-items-center self-start rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                        aria-label={`Remove ${component.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ORDER SUMMARY */}
            <div className="sticky top-24 h-fit rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                Order Summary
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Items</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold">
                    {formatNaira(total)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup</span>
                  <span className="font-semibold text-green-600">
                    Free
                  </span>
                </div>
              </div>

              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-lg">
                <span className="font-bold text-brand-navy">Total</span>
                <motion.span
                  key={total}
                  initial={{ scale: 0.9, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-bold text-brand-navy"
                >
                  {formatNaira(total)}
                </motion.span>
              </div>

              {checkoutError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={isRedirecting || cartItems.length === 0}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-navy font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Redirecting to Paystack...
                  </>
                ) : (
                  <>Pay {formatNaira(total)}</>
                )}
              </button>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                Secure payment powered by Paystack
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}