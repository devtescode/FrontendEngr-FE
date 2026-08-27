import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  ShoppingCart,
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

const BASE_URL = "http://localhost:4500";

const CART_STORAGE_KEY = "pulselab_cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Cart — PulseLab" }],
  }),
  // component: CartPage,

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
  // ===================================================
  // INITIAL CART
  // ===================================================
  //
  // IMPORTANT:
  // We load the previous cart from localStorage
  // immediately.
  //
  // This prevents:
  //
  // "Your cart is empty"
  //
  // from flashing before the backend responds.
  //
  const [cart, setCart] = useState<CartData>(() => {
    try {
      const savedCart =
        localStorage.getItem(CART_STORAGE_KEY);

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (
          parsedCart &&
          Array.isArray(parsedCart.items)
        ) {
          return parsedCart;
        }
      }
    } catch (error) {
      console.error(
        "Failed to load saved cart:",
        error
      );
    }

    return {
      items: [],
    };
  });

  // ===================================================
  // UPDATE STATE
  // ===================================================
  //
  // This is ONLY used when the user clicks +, -, delete.
  //
  // It is NOT used when entering the page.
  //
  const [updating, setUpdating] =
    useState<string | null>(null);

  // ===================================================
  // PREVENT DUPLICATE FETCH
  // ===================================================

  const hasFetched = useRef(false);

  // ===================================================
  // GET TOKEN
  // ===================================================

  const getToken = () => {
    return sessionStorage.getItem(
      "pulselab_token"
    );
  };

  // ===================================================
  // NORMALIZE CART
  // ===================================================

  const normalizeCart = (
    data: any
  ): CartData => {
    if (!data) {
      return {
        items: [],
      };
    }

    // Backend:
    // { items: [...] }

    if (Array.isArray(data.items)) {
      return {
        ...data,
        items: data.items,
      };
    }

    // Backend:
    // { cart: { items: [...] } }

    if (
      data.cart &&
      Array.isArray(data.cart.items)
    ) {
      return {
        ...data.cart,
        items: data.cart.items,
      };
    }

    // Backend:
    // [...]

    if (Array.isArray(data)) {
      return {
        items: data,
      };
    }

    return {
      items: [],
    };
  };

  // ===================================================
  // SAVE CART LOCALLY
  // ===================================================
  //
  // Every time we receive the latest cart,
  // save it locally.
  //
  // Next time the user opens /cart,
  // the cart is available immediately.
  //
  const saveCartLocally = (
    updatedCart: CartData
  ) => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(updatedCart)
      );
    } catch (error) {
      console.error(
        "Failed to save cart locally:",
        error
      );
    }
  };

  // ===================================================
  // UPDATE CART
  // ===================================================
  //
  // One function handles both:
  //
  // 1. React state
  // 2. Local storage
  //
  const updateCart = (
    updatedCart: CartData
  ) => {
    setCart(updatedCart);

    saveCartLocally(updatedCart);
  };

  // ===================================================
  // GET COMPONENT ID
  // ===================================================

  const getComponentId = (
    componentId:
      | ComponentData
      | string
  ): string => {
    if (typeof componentId === "string") {
      return componentId;
    }

    return componentId?._id || "";
  };

  // ===================================================
  // FETCH CART SILENTLY
  // ===================================================
  //
  // IMPORTANT:
  //
  // There is NO loading state here.
  //
  // The page already has the cached cart.
  //
  // The backend request happens in the background.
  //
  const fetchCartSilently = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      console.log(
        "🛒 SILENTLY FETCHING CART..."
      );

      const response = await fetch(
        `${BASE_URL}/engineering/cart`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      );

      const data =
        await response.json();

      console.log(
        "🛒 GET CART RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
          "Failed to load cart"
        );
      }

      const normalizedCart =
        normalizeCart(data);

      console.log(
        "🛒 SILENT CART:",
        normalizedCart
      );

      // Update only when backend responds.
      updateCart(normalizedCart);
    } catch (error: any) {
      if (
        error?.name ===
        "AbortError"
      ) {
        console.error(
          "🛒 Silent cart request timed out."
        );
      } else {
        console.error(
          "🛒 Silent cart fetch error:",
          error
        );
      }

      // IMPORTANT:
      //
      // Do NOT clear the existing cart here.
      //
      // If the network temporarily fails,
      // keep showing the cached cart.
    } finally {
      clearTimeout(timeout);
    }
  };

  // ===================================================
  // LOAD CART SILENTLY
  // ===================================================

  useEffect(() => {
    if (hasFetched.current) {
      return;
    }

    hasFetched.current = true;

    // The page is already displaying the cached cart.
    // This request happens silently in the background.
    fetchCartSilently();
  }, []);

  // ===================================================
  // REAL-TIME CART UPDATE
  // ===================================================

  useEffect(() => {
    const handleCartUpdated = (
      updatedCart: any
    ) => {
      console.log(
        "🛒🔥 REAL-TIME CART UPDATE:",
        updatedCart
      );

      const normalizedCart =
        normalizeCart(updatedCart);

      // Immediately update UI + cache.
      updateCart(normalizedCart);
    };

    const handleConnect = () => {
      console.log(
        "🟢 Cart socket connected:",
        socket.id
      );

      // =================================================
      // ASK SERVER FOR CURRENT CART
      // =================================================
      //
      // Your backend should listen for:
      //
      // "cart:request"
      //
      // and respond with:
      //
      // "cart:updated"
      //
      // containing the user's current cart.
      //
      socket.emit("cart:request");
    };

    const handleDisconnect = (
      reason: string
    ) => {
      console.log(
        "🔴 Cart socket disconnected:",
        reason
      );
    };

    socket.on(
      "cart:updated",
      handleCartUpdated
    );

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    // Socket might already be connected.
    if (socket.connected) {
      console.log(
        "🟢 Socket already connected:",
        socket.id
      );

      // Ask for latest cart.
      socket.emit("cart:request");
    }

    return () => {
      socket.off(
        "cart:updated",
        handleCartUpdated
      );

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );
    };
  }, []);

  // ===================================================
  // REMOVE ITEM
  // ===================================================

  const removeItem = async (
    componentId: string
  ) => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!componentId) {
      alert(
        "Component ID is missing."
      );
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

      const data =
        await response.json();

      console.log(
        "🗑️ REMOVE CART RESPONSE:",
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

      updateCart(normalizedCart);
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

  // ===================================================
  // INCREASE QUANTITY
  // ===================================================

  const increaseQuantity = async (
    item: CartItem
  ) => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    const componentId =
      getComponentId(
        item.componentId
      );

    if (!componentId) {
      alert(
        "Component ID is missing."
      );
      return;
    }

    // =================================================
    // CHECK STOCK
    // =================================================

    if (
      typeof item.componentId !==
      "string" &&
      item.componentId.stock !==
      undefined
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
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            componentId,
            quantity: 1,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "➕ INCREASE CART RESPONSE:",
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

      updateCart(normalizedCart);
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

  // ===================================================
  // DECREASE QUANTITY
  // ===================================================

  const decreaseQuantity = async (
    item: CartItem
  ) => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    const componentId =
      getComponentId(
        item.componentId
      );

    if (!componentId) {
      alert(
        "Component ID is missing."
      );
      return;
    }

    try {
      setUpdating(componentId);

      // =================================================
      // QUANTITY = 1
      // REMOVE ITEM
      // =================================================

      if (item.quantity <= 1) {
        const response =
          await fetch(
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
          "🗑️ REMOVE FROM DECREASE:",
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

        updateCart(normalizedCart);

        return;
      }

      // =================================================
      // DECREASE BY 1
      // =================================================

      const newQuantity =
        item.quantity - 1;

      const response =
        await fetch(
          `${BASE_URL}/engineering/cart/${componentId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              quantity:
                newQuantity,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "➖ DECREASE CART RESPONSE:",
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

      updateCart(normalizedCart);
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

  // ===================================================
  // TOTAL PRICE
  // ===================================================

  const total = useMemo(() => {
    if (
      !Array.isArray(
        cart?.items
      )
    ) {
      return 0;
    }

    return cart.items.reduce(
      (sum, item) => {
        const component =
          item.componentId;

        if (
          !component ||
          typeof component ===
          "string"
        ) {
          return sum;
        }

        const price =
          Number(
            component.price
          ) || 0;

        const quantity =
          Number(
            item.quantity
          ) || 0;

        return (
          sum +
          price * quantity
        );
      },
      0
    );
  }, [cart]);

  // ===================================================
  // TOTAL QUANTITY
  // ===================================================

  const totalQuantity =
    useMemo(() => {
      if (
        !Array.isArray(
          cart?.items
        )
      ) {
        return 0;
      }

      return cart.items.reduce(
        (sum, item) =>
          sum +
          (Number(
            item.quantity
          ) || 0),
        0
      );
    }, [cart]);

  // ===================================================
  // FORMAT NAIRA
  // ===================================================

  const formatNaira = (
    amount: number
  ) => {
    return `₦${amount.toLocaleString(
      "en-NG"
    )}`;
  };

  // ===================================================
  // SAFE CART ITEMS
  // ===================================================

  const cartItems =
    Array.isArray(
      cart?.items
    )
      ? cart.items
      : [];

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
            {totalQuantity === 1
              ? "item"
              : "items"}{" "}
            in your cart
          </p>
        </div>

        {/* =================================================
            IMPORTANT

            There is NO loading cart here.

            There is also NO "Updating cart..."
            when the page first opens.

            Updating only appears when the user
            actually clicks +, -, or delete.
        ================================================= */}

        {/* {updating && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" />

            <span>
              Updating cart...
            </span>
          </div>
        )} */}

        {/* =================================================
            EMPTY CART
        ================================================= */}

        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center">

            <ShoppingCart className="mx-auto mb-5 h-12 w-12 text-slate-300" />

            <h2 className="text-xl font-semibold text-brand-navy">
              Your cart is empty
            </h2>

            <p className="mt-2 text-slate-500">
              You haven't added any
              components yet.
            </p>

            <Link
              to="/components"
              className="mt-6 inline-block rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Browse components
            </Link>

          </div>
        ) : (

          /* =================================================
             CART + SUMMARY
          ================================================= */

          <div className="grid gap-8 lg:grid-cols-3">

            {/* CART ITEMS */}

            <div className="space-y-3 lg:col-span-2">

              <AnimatePresence mode="popLayout">

                {cartItems.map(
                  (
                    item,
                    index
                  ) => {

                    // Make sure component is populated.

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

                    if (
                      !componentId
                    ) {
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

                        {/* IMAGE */}

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

                        {/* DETAILS */}

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

                        {/* QUANTITY */}

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

                        {/* PRICE */}

                        <div className="w-full text-left font-bold text-brand-navy sm:w-28 sm:text-right">
                          {formatNaira(
                            itemTotal
                          )}
                        </div>

                        {/* DELETE */}

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

            {/* ORDER SUMMARY */}

            <div className="sticky top-24 h-fit rounded-2xl border border-slate-200 bg-white p-6">

              <h3 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                Order Summary
              </h3>

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
                    {formatNaira(
                      total
                    )}
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
                  {formatNaira(
                    total
                  )}
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