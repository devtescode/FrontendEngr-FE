import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppShell } from "@/components/AppShell";
import { socket } from "@/lib/socket";
import { RequireAuth } from "@/components/RequireAuth";
import {
  cartCache,
  pushToast,
  setCartCacheFromResponse,
} from "@/components/ComponentCard";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

const CART_STORAGE_KEY = "pulselab_cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Cart — PulseLab" }],
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

type ComponentData = {
  _id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  description?: string;
  category?: string;
};

type CartItem = {
  componentId: ComponentData | string;
  quantity: number;
};

type CartData = {
  _id?: string;
  userId?: string;
  items: CartItem[];
};

// =====================================================
// CART PAGE
// =====================================================

function CartPage() {
  const location = useLocation();

  // ===================================================
  // BUILD INITIAL STATE FROM CACHE (fallback to localStorage)
  // ===================================================
  // The cart cache holds the most recent state known to
  // the app — written by ComponentCard when the user
  // increments/decrements there. Use it first so the
  // cart page opens with fresh data.
  //
  const [cart, setCart] = useState<CartData>(() => {
    // 1) Try localStorage first
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart && Array.isArray(parsedCart.items)) {
          return parsedCart;
        }
      }
    } catch (error) {
      console.error("Failed to load saved cart:", error);
    }

    // 2) Fall back to empty
    return { items: [] };
  });

  const [updating, setUpdating] = useState<string | null>(null);

  // ===================================================
  // PAYMENT STATE
  // ===================================================
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const hasFetched = useRef(false);

  const getToken = () => {
    return sessionStorage.getItem("pulselab_token");
  };

  // ===================================================
  // RESET PAYMENT STATE WHEN RETURNING TO /cart
  // ===================================================
  useEffect(() => {
    setIsRedirecting(false);
    setHasInitialized(false);
    sessionStorage.removeItem("pulselab_pending_reference");
  }, [location.pathname]);

  // ===================================================
  // NORMALIZE CART
  // ===================================================

  const normalizeCart = (data: any): CartData => {
    if (!data) return { items: [] };

    if (Array.isArray(data.items)) {
      return { ...data, items: data.items };
    }

    if (data.cart && Array.isArray(data.cart.items)) {
      return { ...data.cart, items: data.cart.items };
    }

    if (Array.isArray(data)) {
      return { items: data };
    }

    return { items: [] };
  };

  // ===================================================
  // SAVE CART LOCALLY
  // ===================================================

  const saveCartLocally = (updatedCart: CartData) => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(updatedCart)
      );
    } catch (error) {
      console.error("Failed to save cart locally:", error);
    }
  };

  const updateCart = (updatedCart: CartData) => {
    setCart(updatedCart);
    saveCartLocally(updatedCart);
  };

  const getComponentId = (
    componentId: ComponentData | string
  ): string => {
    if (typeof componentId === "string") return componentId;
    return componentId?._id || "";
  };

  // ===================================================
  // FETCH CART (FORCE, not silent-gated)
  // ===================================================
  // Always hits the server. Used on mount and after
  // every socket `cart:updated` so the page reconciles
  // with the source of truth.
  //
  const fetchCart = async (opts?: { silent?: boolean }) => {
    const token = getToken();
    if (!token) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      console.log("🛒 FETCHING CART (cart page)...");

      const response = await fetch(`${API_URL}/engineering/cart`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      const data = await response.json();
      console.log("🛒 GET CART RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load cart");
      }

      const normalizedCart = normalizeCart(data);
      updateCart(normalizedCart);

      // Keep the shared ComponentCard cache in sync so
      // the components page reflects the same state.
      setCartCacheFromResponse(data);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        if (!opts?.silent) {
          console.error("🛒 Cart request timed out.");
        }
      } else {
        if (!opts?.silent) {
          console.error("🛒 Cart fetch error:", error);
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  // ===================================================
  // LOAD CART ON MOUNT
  // ===================================================
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Fetch immediately. Do NOT wait — the initial
    // state above already shows cached data, and this
    // reconciles with the server.
    fetchCart();
  }, []);

  // ===================================================
  // REFRESH CART ON ROUTE CHANGE
  // ===================================================
  // If the user navigates away and back without a full
  // page reload, the component may remount but the
  // previous fetch may be stale. Refetch on every
  // mount for the /cart path.
  //
  useEffect(() => {
    if (location.pathname !== "/cart") return;

    // Skip the very first run — the mount effect above
    // already fetched.
    if (!hasFetched.current) return;

    fetchCart({ silent: true });
  }, [location.pathname]);

  // ===================================================
  // REAL-TIME CART UPDATE
  // ===================================================
  // When the server broadcasts a cart update, both
  // refresh from the server. This guarantees the cart
  // page and the components page are always aligned.
  //
  useEffect(() => {
    const handleCartUpdated = async (updatedCart: any) => {
      console.log("🛒🔥 REAL-TIME CART UPDATE:", updatedCart);

      // Update the local state immediately from the
      // payload so the UI feels instant.
      const normalizedCart = normalizeCart(updatedCart);
      updateCart(normalizedCart);

      // Also keep the shared cache fresh.
      setCartCacheFromResponse(updatedCart);

      // Then reconcile with the server in case the
      // payload was partial.
      fetchCart({ silent: true });
    };

    const handleConnect = () => {
      console.log("🟢 Cart socket connected:", socket.id);
      // Ask for a fresh cart after reconnecting.
      fetchCart({ silent: true });
    };

    const handleDisconnect = (reason: string) => {
      console.log("🔴 Cart socket disconnected:", reason);
    };

    socket.on("cart:updated", handleCartUpdated);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // If already connected, request a fresh cart.
    if (socket.connected) {
      console.log("🟢 Socket already connected:", socket.id);
      fetchCart({ silent: true });
    }

    return () => {
      socket.off("cart:updated", handleCartUpdated);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

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

    const itemName =
      cartItems.find(
        (it) => getComponentId(it.componentId) === componentId
      )?.componentId &&
      typeof cartItems.find(
        (it) => getComponentId(it.componentId) === componentId
      )?.componentId === "object"
        ? (cartItems.find(
            (it) => getComponentId(it.componentId) === componentId
          )?.componentId as ComponentData).name
        : "Item";

    try {
      setUpdating(componentId);

      const response = await fetch(
        `${API_URL}/engineering/cart/${componentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      console.log("🗑️ REMOVE CART RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to remove item");
      }

      const normalized = normalizeCart(data);
      updateCart(normalized);
      setCartCacheFromResponse(data);

      pushToast("info", `${itemName} removed from cart`);
    } catch (error: any) {
      console.error("Remove cart item error:", error);
      pushToast(
        "error",
        error?.message || "Failed to remove item"
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

    const componentId = getComponentId(item.componentId);
    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    if (
      typeof item.componentId !== "string" &&
      item.componentId.stock !== undefined
    ) {
      if (item.quantity >= item.componentId.stock) {
        pushToast(
          "error",
          `Only ${item.componentId.stock} unit${
            item.componentId.stock === 1 ? "" : "s"
          } available.`
        );
        return;
      }
    }

    try {
      setUpdating(componentId);

      const response = await fetch(`${API_URL}/engineering/addtocart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ componentId, quantity: 1 }),
      });

      const data = await response.json();
      console.log("➕ INCREASE CART RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to increase quantity"
        );
      }

      const normalized = normalizeCart(data);
      updateCart(normalized);
      setCartCacheFromResponse(data);
    } catch (error: any) {
      console.error("Increase quantity error:", error);
      pushToast(
        "error",
        error?.message || "Failed to increase quantity"
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

    const componentId = getComponentId(item.componentId);
    if (!componentId) {
      pushToast("error", "Component ID is missing.");
      return;
    }

    const itemName =
      typeof item.componentId === "object"
        ? item.componentId.name
        : "Item";

    try {
      setUpdating(componentId);

      if (item.quantity <= 1) {
        const response = await fetch(
          `${API_URL}/engineering/cart/${componentId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await response.json();
        console.log("🗑️ REMOVE FROM DECREASE:", data);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to remove item");
        }

        const normalized = normalizeCart(data);
        updateCart(normalized);
        setCartCacheFromResponse(data);

        pushToast("info", `${itemName} removed from cart`);
        return;
      }

      const newQuantity = item.quantity - 1;

      const response = await fetch(
        `${API_URL}/engineering/cart/${componentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        }
      );

      const data = await response.json();
      console.log("➖ DECREASE CART RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to decrease quantity"
        );
      }

      const normalized = normalizeCart(data);
      updateCart(normalized);
      setCartCacheFromResponse(data);
    } catch (error: any) {
      console.error("Decrease quantity error:", error);
      pushToast(
        "error",
        error?.message || "Failed to decrease quantity"
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
      const component = item.componentId;
      if (!component || typeof component === "string") return sum;

      const price = Number(component.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + price * quantity;
    }, 0);
  }, [cart]);

  // ===================================================
  // TOTAL QUANTITY
  // ===================================================

  const totalQuantity = useMemo(() => {
    if (!Array.isArray(cart?.items)) return 0;

    return cart.items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );
  }, [cart]);

  // ===================================================
  // FORMAT NAIRA
  // ===================================================

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG")}`;
  };

  // ===================================================
  // SAFE CART ITEMS
  // ===================================================

  const cartItems = Array.isArray(cart?.items) ? cart.items : [];

  // ===================================================
  // HANDLE CHECKOUT (PAYSTACK)
  // ===================================================

  const handleCheckout = async () => {
    console.log("💳 Initiating checkout...");

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
      const response = await fetch(
        `${API_URL}/api/paystack/initialize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        console.error(
          "Non-JSON response from paystack initialize:",
          rawText.slice(0, 300)
        );
        throw new Error(
          response.ok
            ? "Server returned an invalid response."
            : `Payment endpoint not found (HTTP ${response.status}).`
        );
      }

      if (!response.ok || !data?.authorizationUrl) {
        throw new Error(
          data?.message || "Unable to initialize payment"
        );
      }

      if (data.reference) {
        sessionStorage.setItem(
          "pulselab_pending_reference",
          data.reference
        );
      }

      window.location.href = data.authorizationUrl;
    } catch (error: any) {
      console.error("Checkout error:", error);
      const message =
        error?.message || "Unable to start payment. Please try again.";
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
                  if (
                    !item.componentId ||
                    typeof item.componentId === "string"
                  ) {
                    return null;
                  }

                  const component = item.componentId;
                  const componentId = component._id;
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
                      {/* IMAGE */}
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

                      {/* DETAILS */}
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

                      {/* QUANTITY */}
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

                      {/* PRICE */}
                      <div className="w-full text-left font-bold text-brand-navy sm:w-28 sm:text-right">
                        {formatNaira(itemTotal)}
                      </div>

                      {/* DELETE */}
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

              {/* TOTAL */}
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

              {/* ERROR */}
              {checkoutError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* PAY BUTTON */}
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