import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { socket } from "@/lib/socket";

const BASE_URL = "http://localhost:4500";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Cart — PulseLab" }],
  }),
  component: CartPage,
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
  const [cart, setCart] = useState<CartData>({
    items: [],
  });

  const [loading, setLoading] = useState(true);

  const [updating, setUpdating] = useState<string | null>(null);

  // =====================================================
  // GET TOKEN
  // =====================================================

  const getToken = () => {
    return sessionStorage.getItem("pulselab_token");
  };

  // =====================================================
  // NORMALIZE CART RESPONSE
  //
  // This protects the frontend if the backend returns:
  //
  // { items: [...] }
  //
  // OR
  //
  // { cart: { items: [...] } }
  //
  // OR
  //
  // [...]
  // =====================================================

  const normalizeCart = (data: any): CartData => {
    if (!data) {
      return {
        items: [],
      };
    }

    // Backend returns:
    // { items: [...] }
    if (Array.isArray(data.items)) {
      return {
        ...data,
        items: data.items,
      };
    }

    // Backend returns:
    // { cart: { items: [...] } }
    if (data.cart && Array.isArray(data.cart.items)) {
      return {
        ...data.cart,
        items: data.cart.items,
      };
    }

    // Backend returns array directly
    if (Array.isArray(data)) {
      return {
        items: data,
      };
    }

    // Anything unexpected
    return {
      items: [],
    };
  };

  // =====================================================
  // GET COMPONENT ID
  //
  // componentId can either be:
  //
  // {
  //   _id: "..."
  // }
  //
  // OR
  //
  // "..."
  // =====================================================

  const getComponentId = (
    componentId: ComponentData | string
  ): string => {
    if (typeof componentId === "string") {
      return componentId;
    }

    return componentId?._id || "";
  };

  // =====================================================
  // FETCH CART FROM DATABASE
  // =====================================================

  const fetchCart = async () => {
    const token = getToken();

    if (!token) {
      setCart({
        items: [],
      });

      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${BASE_URL}/engineering/cart`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log("GET CART RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load cart"
        );
      }

      const normalizedCart = normalizeCart(data);

      setCart(normalizedCart);
    } catch (error) {
      console.error("Fetch cart error:", error);

      setCart({
        items: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD CART WHEN PAGE OPENS
  // =====================================================

  useEffect(() => {
    fetchCart();
  }, []);

  // =====================================================
  // REAL-TIME CART UPDATE
  // =====================================================

  useEffect(() => {
    const handleCartUpdated = (updatedCart: any) => {
      console.log(
        "REAL-TIME CART UPDATE:",
        updatedCart
      );

      const normalizedCart =
        normalizeCart(updatedCart);

      setCart(normalizedCart);
    };

    socket.on(
      "cart:updated",
      handleCartUpdated
    );

    return () => {
      socket.off(
        "cart:updated",
        handleCartUpdated
      );
    };
  }, []);

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const removeItem = async (
    componentId: string
  ) => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!componentId) {
      console.error(
        "Cannot remove item: Component ID is missing"
      );

      alert("Component ID is missing.");
      return;
    }

    try {
      setUpdating(componentId);

      const response = await fetch(
        `${BASE_URL}/engineering/cart/${componentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log(
        "REMOVE CART RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to remove item"
        );
      }

      const normalizedCart =
        normalizeCart(data);

      setCart(normalizedCart);
    } catch (error: any) {
      console.error(
        "Remove cart item error:",
        error
      );

      alert(
        error?.message ||
          "Failed to remove item"
      );
    } finally {
      setUpdating(null);
    }
  };

  // =====================================================
  // INCREASE QUANTITY
  // =====================================================

  const increaseQuantity = async (
    item: CartItem
  ) => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    const componentId = getComponentId(
      item.componentId
    );

    if (!componentId) {
      console.error(
        "Cannot increase quantity: Component ID is missing",
        item
      );

      alert("Component ID is missing.");
      return;
    }

    // If populated object
    if (
      typeof item.componentId !== "string" &&
      item.componentId.stock !== undefined
    ) {
      if (
        item.quantity >=
        item.componentId.stock
      ) {
        return;
      }
    }

    try {
      setUpdating(componentId);

      const response = await fetch(
        `${BASE_URL}/engineering/addtocart`,
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

      console.log(
        "INCREASE CART RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to increase quantity"
        );
      }

      const normalizedCart =
        normalizeCart(data);

      setCart(normalizedCart);
    } catch (error: any) {
      console.error(
        "Increase quantity error:",
        error
      );

      alert(
        error?.message ||
          "Failed to increase quantity"
      );
    } finally {
      setUpdating(null);
    }
  };

  // =====================================================
  // DECREASE QUANTITY
  // =====================================================

  const decreaseQuantity = async (
    item: CartItem
  ) => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    const componentId = getComponentId(
      item.componentId
    );

    if (!componentId) {
      console.error(
        "Cannot decrease quantity: Component ID is missing",
        item
      );

      alert("Component ID is missing.");
      return;
    }

    try {
      setUpdating(componentId);

      // ================================================
      // IF QUANTITY IS 1
      // REMOVE ITEM
      // ================================================

      if (item.quantity <= 1) {
        const response = await fetch(
          `${BASE_URL}/engineering/cart/${componentId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data =
          await response.json();

        console.log(
          "REMOVE FROM DECREASE RESPONSE:",
          data
        );

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to remove item"
          );
        }

        const normalizedCart =
          normalizeCart(data);

        setCart(normalizedCart);

        return;
      }

      // ================================================
      // DECREASE BY 1
      // ================================================

      const newQuantity =
        item.quantity - 1;

      const response = await fetch(
        `${BASE_URL}/engineering/cart/${componentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: newQuantity,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "DECREASE CART RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to decrease quantity"
        );
      }

      const normalizedCart =
        normalizeCart(data);

      setCart(normalizedCart);
    } catch (error: any) {
      console.error(
        "Decrease quantity error:",
        error
      );

      alert(
        error?.message ||
          "Failed to decrease quantity"
      );
    } finally {
      setUpdating(null);
    }
  };

  // =====================================================
  // TOTAL
  // =====================================================

  const total = useMemo(() => {
    if (!Array.isArray(cart?.items)) {
      return 0;
    }

    return cart.items.reduce(
      (sum, item) => {
        const component =
          item.componentId;

        if (
          !component ||
          typeof component === "string"
        ) {
          return sum;
        }

        const price =
          Number(component.price) || 0;

        const quantity =
          Number(item.quantity) || 0;

        return (
          sum +
          price * quantity
        );
      },
      0
    );
  }, [cart]);

  // =====================================================
  // TOTAL QUANTITY
  // =====================================================

  const totalQuantity = useMemo(() => {
    if (!Array.isArray(cart?.items)) {
      return 0;
    }

    return cart.items.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 0),
      0
    );
  }, [cart]);

  // =====================================================
  // FORMAT NAIRA
  // =====================================================

  const formatNaira = (
    amount: number
  ) => {
    return `₦${amount.toLocaleString(
      "en-NG"
    )}`;
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-32">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading cart...
          </div>
        </div>
      </AppShell>
    );
  }

  // =====================================================
  // SAFE ITEMS
  // =====================================================

  const cartItems = Array.isArray(
    cart?.items
  )
    ? cart.items
    : [];

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-12">

        {/* ============================================
            HEADER
        ============================================ */}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-navy">
            Your Cart
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {totalQuantity}{" "}
            {totalQuantity === 1
              ? "item"
              : "items"}{" "}
            in your cart
          </p>
        </div>

        {/* ============================================
            EMPTY CART
        ============================================ */}

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

          /* ==========================================
             CART + SUMMARY
          ========================================== */

          <div className="grid gap-8 lg:grid-cols-3">

            {/* ========================================
                CART ITEMS
            ======================================== */}

            <div className="space-y-3 lg:col-span-2">

              <AnimatePresence mode="popLayout">

                {cartItems.map(
                  (item, index) => {

                    /*
                     * Make sure componentId
                     * is populated.
                     */

                    if (
                      !item.componentId ||
                      typeof item.componentId ===
                        "string"
                    ) {
                      return null;
                    }

                    const component =
                      item.componentId;

                    const componentId =
                      component._id;

                    if (!componentId) {
                      return null;
                    }

                    const isUpdating =
                      updating ===
                      componentId;

                    const itemTotal =
                      (Number(
                        component.price
                      ) || 0) *
                      (Number(
                        item.quantity
                      ) || 0);

                    return (
                      <motion.div
                        key={`${componentId}-${index}`}
                        layout
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          x: -40,
                        }}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                      >

                        {/* =================================
                            IMAGE
                        ================================= */}

                        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">

                          {component.image ? (
                            <img
                              src={
                                component.image
                              }
                              alt={
                                component.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">
                              📦
                            </span>
                          )}

                        </div>

                        {/* =================================
                            DETAILS
                        ================================= */}

                        <div className="min-w-0 flex-1">

                          <div className="truncate font-semibold text-brand-navy">
                            {
                              component.name
                            }
                          </div>

                          <div className="mt-1 font-mono text-xs text-slate-500">
                            SKU:{" "}
                            {
                              component.sku
                            }
                          </div>

                          <div className="mt-1 text-sm text-slate-500">
                            {formatNaira(
                              Number(
                                component.price
                              ) || 0
                            )}{" "}
                            each
                          </div>

                        </div>

                        {/* =================================
                            QUANTITY
                        ================================= */}

                        <div className="flex items-center self-start rounded-lg border border-slate-200 sm:self-auto">

                          {/* MINUS */}

                          <button
                            type="button"
                            disabled={
                              isUpdating
                            }
                            onClick={() =>
                              decreaseQuantity(
                                item
                              )
                            }
                            className="grid size-9 place-items-center transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </button>

                          {/* NUMBER */}

                          <span className="flex w-10 items-center justify-center text-sm font-semibold">

                            {isUpdating ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              item.quantity
                            )}

                          </span>

                          {/* PLUS */}

                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              item.quantity >=
                                component.stock
                            }
                            onClick={() =>
                              increaseQuantity(
                                item
                              )
                            }
                            className="grid size-9 place-items-center transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </button>

                        </div>

                        {/* =================================
                            PRICE
                        ================================= */}

                        <div className="w-full text-left font-bold text-brand-navy sm:w-28 sm:text-right">
                          {formatNaira(
                            itemTotal
                          )}
                        </div>

                        {/* =================================
                            DELETE
                        ================================= */}

                        <button
                          type="button"
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            removeItem(
                              componentId
                            )
                          }
                          className="grid size-9 shrink-0 place-items-center self-start rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                          aria-label={`Remove ${component.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>

                      </motion.div>
                    );
                  }
                )}

              </AnimatePresence>

            </div>

            {/* ==========================================
                ORDER SUMMARY
            ========================================== */}

            <div className="sticky top-24 h-fit rounded-2xl border border-slate-200 bg-white p-6">

              <h3 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                Order Summary
              </h3>

              {/* SUBTOTAL */}

              <div className="space-y-2 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Items
                  </span>

                  <span className="font-semibold">
                    {totalQuantity}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {formatNaira(total)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Pickup
                  </span>

                  <span className="font-semibold text-green-600">
                    Free
                  </span>
                </div>

              </div>

              {/* TOTAL */}

              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-lg">

                <span className="font-bold text-brand-navy">
                  Total
                </span>

                <motion.span
                  key={total}
                  initial={{
                    scale: 0.9,
                    opacity: 0.5,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  className="font-bold text-brand-navy"
                >
                  {formatNaira(total)}
                </motion.span>

              </div>

              {/* CHECKOUT */}

              <Link
                to="/checkout"
                className="mt-6 block h-12 w-full rounded-lg bg-brand-navy text-center font-semibold leading-[3rem] text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                Checkout
              </Link>

            </div>

          </div>
        )}

      </div>
    </AppShell>
  );
}