import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  ArrowUpRight,
  Minus,
  Plus,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { BackendComponent } from "@/lib/api";
import { socket } from "@/lib/socket";
import { API_URLS } from "@/utils/apiConfig";

const BASE_URL = "http://localhost:4500";

export function ComponentCard({
  c,
  index = 0,
}: {
  c: BackendComponent;
  index?: number;
}) {
  const isOutOfStock = c.stock <= 0;
  const isLowStock = c.stock > 0 && c.stock <= 5;

  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(false);

  /*
   * =====================================================
   * GET COMPONENT ID
   * =====================================================
   *
   * Your backend requires a MongoDB ObjectId.
   *
   * Depending on how your API returns the component,
   * the ID may be c._id or c.id.
   */

  const componentId = c._id;

  /*
   * =====================================================
   * GET TOKEN
   * =====================================================
   */

  const getToken = () => {
    return sessionStorage.getItem("pulselab_token");
  };


  useEffect(() => {
  const loadCartQuantity = async () => {
    const token = sessionStorage.getItem(
      "pulselab_token"
    );

    if (!token || !componentId) {
      return;
    }

    try {
      const response = await fetch(
        // `${BASE_URL}/engineering/cart`,
        API_URLS.cart,
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

      updateQuantityFromCart(cart);

    } catch (error) {
      console.error(
        "Failed to restore cart quantity:",
        error
      );
    }
  };

  loadCartQuantity();
}, [componentId]);
  /*
   * =====================================================
   * CHECK COMPONENT ID
   * =====================================================
   */

  if (!componentId) {
    console.error("Component ID is missing:", c);
  }

  /*
   * =====================================================
   * UPDATE QUANTITY FROM CART
   * =====================================================
   */

  const updateQuantityFromCart = (cart: any) => {
    if (!cart?.items) {
      return;
    }

    const item = cart.items.find((cartItem: any) => {
      const cartComponentId =
        typeof cartItem.componentId === "object"
          ? cartItem.componentId?._id
          : cartItem.componentId;

      return (
        String(cartComponentId) === String(componentId)
      );
    });

    setQuantity(item?.quantity ?? 0);
  };

  /*
   * =====================================================
   * REAL-TIME CART UPDATE
   * =====================================================
   */

  useEffect(() => {
    const handleCartUpdated = (cart: any) => {
      updateQuantityFromCart(cart);
    };

    socket.on("cart:updated", handleCartUpdated);

    return () => {
      socket.off("cart:updated", handleCartUpdated);
    };
  }, [componentId]);

  /*
   * =====================================================
   * ADD TO CART
   * =====================================================
   */

  const handleAddToCart = async () => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!componentId) {
      console.error("Component ID is missing:", c);

      alert("Component ID is missing.");
      return;
    }

    if (isOutOfStock) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URLS.addtocart}`,
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

      /*
       * IMPORTANT
       *
       * Do not wait for Socket.IO to update the button.
       * We already know the item was successfully added.
       *
       * Immediately change the UI.
       */

      setQuantity(1);

    } catch (error: any) {
      console.error("Add to cart error:", error);

      alert(
        error.message ||
          "Failed to add item to cart"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * INCREASE QUANTITY
   * =====================================================
   */

  const handleIncrease = async () => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!componentId) {
      alert("Component ID is missing.");
      return;
    }

    if (quantity >= c.stock) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URLS.addtocart}`,
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
          data.message ||
            "Failed to increase quantity"
        );
      }

      /*
       * Immediately update UI.
       */

      setQuantity((prev) => prev + 1);

    } catch (error: any) {
      console.error(
        "Increase quantity error:",
        error
      );

      alert(
        error.message ||
          "Failed to increase quantity"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * DECREASE QUANTITY
   * =====================================================
   */

  const handleDecrease = async () => {
    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!componentId) {
      alert("Component ID is missing.");
      return;
    }

    if (quantity <= 0) {
      return;
    }

    try {
      setLoading(true);

      /*
       * ===============================================
       * REMOVE ITEM
       * ===============================================
       */

      if (quantity === 1) {
        const response = await fetch(
          `${API_URLS.cart}/${componentId}`,
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
            data.message ||
              "Failed to remove item"
          );
        }

        /*
         * Immediately hide +/- controls
         * and show Add to Cart again.
         */

        setQuantity(0);

        return;
      }

      /*
       * ===============================================
       * DECREASE FROM 2 -> 1, 3 -> 2, etc.
       * ===============================================
       */

      const newQuantity = quantity - 1;

      const response = await fetch(
        `${API_URLS.cart}/${componentId}`,
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
        "DECREASE RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to decrease quantity"
        );
      }

      /*
       * Immediately update UI.
       */

      setQuantity(newQuantity);

    } catch (error: any) {
      console.error(
        "Decrease quantity error:",
        error
      );

      alert(
        error.message ||
          "Failed to decrease quantity"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
      }}
      whileHover={{
        y: -6,
      }}
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
            <Package
              className="mb-2 h-12 w-12"
              strokeWidth={1.5}
            />

            <span className="text-sm">
              No image available
            </span>
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

        {/* SKU */}

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          SKU: {c.sku}
        </p>

        {/* NAME */}

        <h3 className="line-clamp-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-brand-navy">
          {c.name}
        </h3>

        {/* DESCRIPTION */}

        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
          {c.description}
        </p>

        {/* PRICE / STOCK */}

        <div className="mt-3 flex items-end justify-between gap-4">

          <div>
            <p className="text-xs font-medium text-slate-400">
              Price
            </p>

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

        {/* =================================================
            CART ACTION
        ================================================= */}

        {quantity === 0 ? (

          /*
           * ADD TO CART
           */

          <button
            type="button"
            disabled={
              isOutOfStock ||
              loading ||
              !componentId
            }
            onClick={handleAddToCart}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-navy/90 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />

                {isOutOfStock
                  ? "Out of Stock"
                  : "Add to Cart"}
              </>
            )}
          </button>

        ) : (

          /*
           * INCREMENT / DECREMENT
           */

          <div className="mt-5 flex h-12 w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* MINUS */}

            <button
              type="button"
              disabled={loading}
              onClick={handleDecrease}
              className="flex h-full w-14 items-center justify-center text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </button>

            {/* QUANTITY */}

            <div className="flex flex-col items-center">
              <span className="text-base font-bold text-brand-navy">
                {quantity}
              </span>

              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                In cart
              </span>
            </div>

            {/* PLUS */}

            <button
              type="button"
              disabled={
                loading ||
                quantity >= c.stock
              }
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