import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CheckSquare,
  Package,
  Search,
  ShoppingCart,
  Users,
  X,
  Eye,
  Mail,
  Hash,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [{ title: "User Carts — Admin" }],
  }),
  component: AdminCarts,
});

const BASE_URL = "http://localhost:4500";

type CartItem = {
  componentId: {
    _id: string;
    name: string;
    sku: string;
    price: number;
    image?: string;
    category?: string;
  };
  quantity: number;
};

type UserCart = {
  _id: string;

  userId: {
    _id: string;
    fullName: string;
    email: string;
    matric: string;
  };

  items: CartItem[];

  updatedAt?: string;
};

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

function AdminCarts() {
  const [carts, setCarts] = useState<UserCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [selectedCarts, setSelectedCarts] =
    useState<string[]>([]);

  /*
   * CART CURRENTLY BEING VIEWED
   */
  const [selectedCart, setSelectedCart] =
    useState<UserCart | null>(null);

  /*
   * =====================================================
   * FETCH CARTS
   * =====================================================
   */

  useEffect(() => {
  if (selectedCart) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [selectedCart]);

  useEffect(() => {
    const loadCarts = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          sessionStorage.getItem("pulselab_token");

        const response = await fetch(
          `${BASE_URL}/admin/getallcarts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load carts"
          );
        }

        setCarts(data.carts || []);
      } catch (error: any) {
        console.error(
          "Failed to load carts:",
          error
        );

        setError(
          error.message ||
            "Failed to load carts"
        );
      } finally {
        setLoading(false);
      }
    };

    loadCarts();
  }, []);

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  const filteredCarts = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return carts;
    }

    return carts.filter((cart) => {
      const user = cart.userId;

      return (
        user?.fullName
          ?.toLowerCase()
          .includes(value) ||
        user?.matric
          ?.toLowerCase()
          .includes(value) ||
        user?.email
          ?.toLowerCase()
          .includes(value)
      );
    });
  }, [carts, search]);

  /*
   * =====================================================
   * CART TOTAL
   * =====================================================
   */

  const getCartTotal = (
    cart: UserCart
  ) => {
    return cart.items.reduce(
      (total, item) => {
        const price =
          Number(
            item.componentId?.price
          ) || 0;

        return (
          total +
          price * item.quantity
        );
      },
      0
    );
  };

  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const totalUnits = carts.reduce(
    (total, cart) =>
      total +
      cart.items.reduce(
        (sum, item) =>
          sum + item.quantity,
        0
      ),
    0
  );

  const totalCartValue =
    carts.reduce(
      (total, cart) =>
        total + getCartTotal(cart),
      0
    );

  /*
   * =====================================================
   * SELECTION
   * =====================================================
   */

  const toggleCart = (
    cartId: string
  ) => {
    setSelectedCarts((current) =>
      current.includes(cartId)
        ? current.filter(
            (id) => id !== cartId
          )
        : [...current, cartId]
    );
  };

  const selectAll = () => {
    setSelectedCarts(
      filteredCarts.map(
        (cart) => cart._id
      )
    );
  };

  const clearSelection = () => {
    setSelectedCarts([]);
  };

  const allSelected =
    filteredCarts.length > 0 &&
    filteredCarts.every((cart) =>
      selectedCarts.includes(
        cart._id
      )
    );

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 rounded-lg bg-white/5" />

            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-28 rounded-2xl bg-white/5"
                  />
                )
              )}
            </div>

            <div className="h-16 rounded-2xl bg-white/5" />
            <div className="h-72 rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-950 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-accent">
            <ShoppingCart className="h-4 w-4" />
            Cart Monitoring
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            User Carts
          </h1>

          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Monitor components students
            currently have in their carts
            before they place an order.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-400">
            <span>{error}</span>

            <button
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            icon={
              <ShoppingCart className="h-5 w-5" />
            }
            label="Active Carts"
            value={carts.length}
          />

          <SummaryCard
            icon={
              <Users className="h-5 w-5" />
            }
            label="Students"
            value={carts.length}
          />

          <SummaryCard
            icon={
              <Package className="h-5 w-5" />
            }
            label="Total Units"
            value={totalUnits}
          />

          <SummaryCard
            icon={
              <span className="text-lg font-bold">
                ₦
              </span>
            }
            label="Cart Value"
            value={formatNaira(
              totalCartValue
            )}
          />

        </div>

        {/* SEARCH */}

        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-xl">

              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search by name, matric number or email..."
                className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 pl-12 pr-10 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10"
              />

              {search && (
                <button
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={
                  allSelected
                    ? clearSelection
                    : selectAll
                }
                className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <CheckSquare className="h-4 w-4" />

                {allSelected
                  ? "Clear all"
                  : "Select all"}
              </button>

              {selectedCarts.length >
                0 && (
                <div className="flex h-11 items-center rounded-xl bg-brand-accent/10 px-4 text-sm font-semibold text-brand-accent">
                  {selectedCarts.length} selected
                </div>
              )}

            </div>

          </div>

        </div>

        {/* RESULT */}

        <div className="mb-4">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-300">
              {filteredCarts.length}
            </span>{" "}
            active cart
            {filteredCarts.length !==
              1 && "s"}
          </p>
        </div>

        {/* EMPTY */}

        {filteredCarts.length ===
        0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-20 text-center">

            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/5">
              <ShoppingCart className="h-8 w-8 text-slate-600" />
            </div>

            <h2 className="text-lg font-semibold text-white">
              {search
                ? "No student found"
                : "No active carts"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search
                ? "Try another name, matric number or email."
                : "Students who add components to their cart will appear here."}
            </p>

          </div>
        ) : (

          /* CARTS */

          <div className="space-y-5">

            {filteredCarts.map(
              (cart) => {
                const user =
                  cart.userId;

                const cartTotal =
                  getCartTotal(cart);

                const isSelected =
                  selectedCarts.includes(
                    cart._id
                  );

                const totalItems =
                  cart.items.reduce(
                    (sum, item) =>
                      sum +
                      item.quantity,
                    0
                  );

                return (
                  <div
                    key={cart._id}
                    className={`overflow-hidden rounded-3xl border bg-slate-900/70 shadow-xl transition ${
                      isSelected
                        ? "border-brand-accent/50 ring-1 ring-brand-accent/20"
                        : "border-white/10"
                    }`}
                  >

                    {/* USER HEADER */}

                    <div className="border-b border-white/10 px-5 py-5 md:px-6">

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex items-center gap-4">

                          <button
                            onClick={() =>
                              toggleCart(
                                cart._id
                              )
                            }
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                              isSelected
                                ? "border-brand-accent bg-brand-accent text-white"
                                : "border-white/20 bg-white/5 text-transparent hover:border-white/40"
                            }`}
                          >
                            <Check className="h-4 w-4" />
                          </button>

                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 text-sm font-bold text-brand-accent">
                            {user?.fullName
                              ?.split(" ")
                              .map(
                                (name) =>
                                  name[0]
                              )
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-white md:text-lg">
                              {user?.fullName}
                            </h2>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">

                              <span className="font-semibold text-brand-accent">
                                {user?.matric}
                              </span>

                              <span className="text-slate-700">
                                •
                              </span>

                              <span className="text-slate-500">
                                {user?.email}
                              </span>

                            </div>
                          </div>

                        </div>

                        <div className="flex flex-wrap items-center gap-3">

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                              Units
                            </p>

                            <p className="mt-0.5 text-sm font-bold text-white">
                              {totalItems}
                            </p>
                          </div>

                          <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 px-4 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                              Total
                            </p>

                            <p className="mt-0.5 text-sm font-bold text-brand-accent">
                              {formatNaira(
                                cartTotal
                              )}
                            </p>
                          </div>

                          {/* VIEW DETAILS */}

                          <button
                            onClick={() =>
                              setSelectedCart(
                                cart
                              )
                            }
                            className="group flex h-11 items-center gap-2 rounded-xl bg-brand-accent px-4 text-sm font-semibold text-white transition hover:bg-brand-accent/90 hover:shadow-lg hover:shadow-brand-accent/10"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                          </button>

                        </div>

                      </div>

                    </div>

                    {/* ITEMS TABLE */}

                    <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px_140px] gap-4 border-b border-white/5 bg-white/[0.015] px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 md:grid">
                      <span>Component</span>
                      <span>Unit Price</span>
                      <span>Quantity</span>
                      <span className="text-right">
                        Subtotal
                      </span>
                    </div>

                    <div className="divide-y divide-white/5">

                      {cart.items.map(
                        (item) => {
                          const component =
                            item.componentId;

                          const subtotal =
                            (Number(
                              component?.price
                            ) || 0) *
                            item.quantity;

                          return (
                            <div
                              key={
                                component._id
                              }
                              className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_130px_100px_140px] md:items-center md:px-6"
                            >

                              <div className="flex min-w-0 items-center gap-4">

                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">

                                  {component?.image ? (
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
                                    <div className="grid h-full place-items-center">
                                      <Package className="h-6 w-6 text-slate-700" />
                                    </div>
                                  )}

                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-white">
                                    {
                                      component?.name
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    SKU:{" "}
                                    {
                                      component?.sku
                                    }
                                  </p>
                                </div>

                              </div>

                              <div className="flex justify-between md:block">
                                <span className="text-xs text-slate-600 md:hidden">
                                  Unit price
                                </span>

                                <span className="text-sm text-slate-300">
                                  {formatNaira(
                                    Number(
                                      component?.price
                                    ) || 0
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between md:block">
                                <span className="text-xs text-slate-600 md:hidden">
                                  Quantity
                                </span>

                                <span className="inline-flex rounded-lg bg-white/5 px-3 py-1.5 text-sm font-bold text-white">
                                  ×{" "}
                                  {
                                    item.quantity
                                  }
                                </span>
                              </div>

                              <div className="flex justify-between md:block md:text-right">
                                <span className="text-xs text-slate-600 md:hidden">
                                  Subtotal
                                </span>

                                <span className="text-sm font-bold text-brand-gold">
                                  {formatNaira(
                                    subtotal
                                  )}
                                </span>
                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                    {/* TOTAL */}

                    <div className="flex justify-end border-t border-white/10 bg-white/[0.02] px-5 py-5 md:px-6">

                      <div className="text-right">

                        <p className="text-xs font-medium uppercase tracking-wider text-slate-600">
                          Total Cart Value
                        </p>

                        <p className="mt-1 text-2xl font-bold text-white">
                          {formatNaira(
                            cartTotal
                          )}
                        </p>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* =====================================================
          DETAILS DRAWER / MODAL
      ===================================================== */}

      {selectedCart && (
        <CartDetails
          cart={selectedCart}
          onClose={() =>
            setSelectedCart(null)
          }
        />
      )}

    </div>
  );
}

/*
 * =====================================================
 * CART DETAILS
 * =====================================================
 */

function CartDetails({
  cart,
  onClose,
}: {
  cart: UserCart;
  onClose: () => void;
}) {
  const user = cart.userId;

  const totalUnits =
    cart.items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  const total =
    cart.items.reduce(
      (sum, item) =>
        sum +
        (Number(
          item.componentId?.price
        ) || 0) *
          item.quantity,
      0
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center md:items-stretch md:justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >

      {/* BACKDROP */}

      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* PANEL */}

      <div className="relative z-10 flex h-[92vh] w-[calc(100%-24px)] max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl md:h-full md:w-[620px] md:rounded-none md:rounded-l-3xl">

        {/* HEADER */}

        <div className="border-b border-white/10 bg-slate-900/90 px-5 py-5 md:px-7">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 text-lg font-bold text-brand-accent">
                {user?.fullName
                  ?.split(" ")
                  .map(
                    (name) =>
                      name[0]
                  )
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                  Cart Details
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  {user?.fullName}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-400">
                  {user?.matric}
                </p>
              </div>

            </div>

            <button
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

          </div>

          {/* USER INFO */}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">

            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <Hash className="h-4 w-4 text-brand-accent" />

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Matric Number
                </p>

                <p className="truncate text-sm font-semibold text-white">
                  {user?.matric}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <Mail className="h-4 w-4 text-brand-accent" />

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Email
                </p>

                <p className="truncate text-sm font-semibold text-white">
                  {user?.email}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* CONTENT */}

        <div className="cart-details-scroll flex-1 overflow-y-auto px-5 py-5 md:px-7">

          <div className="mb-5 flex items-center justify-between">

            <div>
              <h3 className="text-base font-bold text-white">
                Components in Cart
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {cart.items.length} component
                {cart.items.length !==
                  1 && "s"} ·{" "}
                {totalUnits} total units
              </p>
            </div>

            {cart.updatedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="h-3.5 w-3.5" />
                {new Date(
                  cart.updatedAt
                ).toLocaleString()}
              </div>
            )}

          </div>

          {/* ITEMS */}

          <div className="space-y-3">

            {cart.items.map(
              (item) => {
                const component =
                  item.componentId;

                const unitPrice =
                  Number(
                    component?.price
                  ) || 0;

                const subtotal =
                  unitPrice *
                  item.quantity;

                return (
                  <div
                    key={
                      component._id
                    }
                    className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition hover:border-white/20"
                  >

                    <div className="flex gap-4 p-4">

                      {/* IMAGE */}

                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950">

                        {component?.image ? (
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
                          <div className="grid h-full place-items-center">
                            <Package className="h-8 w-8 text-slate-700" />
                          </div>
                        )}

                      </div>

                      {/* INFO */}

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <h4 className="truncate text-sm font-bold text-white">
                              {
                                component.name
                              }
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              SKU:{" "}
                              {
                                component.sku
                              }
                            </p>

                            {component.category && (
                              <span className="mt-2 inline-block rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-400">
                                {
                                  component.category
                                }
                              </span>
                            )}

                          </div>

                          <div className="text-right">

                            <p className="text-xs text-slate-600">
                              Subtotal
                            </p>

                            <p className="mt-1 text-base font-bold text-brand-gold">
                              {formatNaira(
                                subtotal
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">

                          <span className="text-xs text-slate-500">
                            {formatNaira(
                              unitPrice
                            )}{" "}
                            ×{" "}
                            {
                              item.quantity
                            }
                          </span>

                          <span className="rounded-lg bg-brand-accent/10 px-3 py-1.5 text-xs font-bold text-brand-accent">
                            {item.quantity} unit
                            {item.quantity !==
                              1 && "s"}
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* FOOTER */}

        <div className="border-t border-white/10 bg-slate-900/95 px-5 py-5 md:px-7">

          <div className="mb-4 flex items-center justify-between">

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-600">
                Total Items
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {totalUnits} units
              </p>
            </div>

            <div className="text-right">

              <p className="text-xs uppercase tracking-wider text-slate-600">
                Total Cart Value
              </p>

              <p className="mt-1 text-2xl font-bold text-brand-accent">
                {formatNaira(total)}
              </p>

            </div>

          </div>

          {/* <button
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-white/5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close Details
          </button> */}

        </div>

      </div>
    </div>
  );
}

/*
 * =====================================================
 * SUMMARY CARD
 * =====================================================
 */

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded border border-white/10 bg-slate-900/70 p-5 shadow-lg">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>
        </div>

        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent">
          {icon}
        </div>

      </div>

    </div>
  );
}