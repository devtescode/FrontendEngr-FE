import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Component } from "./data";

export type Role = "student" | "admin";

export interface User {
  id: string;
  fullName: string;
  email: string;
  matric: string;
  password: string;
  role: Role;
}

export interface CartItem {
  componentId: string;
  quantity: number;
}

export type OrderStatus =
  | "Paid"
  | "Preparing"
  | "Ready"
  | "Collected";

export interface Order {
  id: string;
  userId: string;
  userName: string;
  matric: string;
  items: {
    componentId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: OrderStatus;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: number;
}

interface AppState {
  users: User[];

  currentUserId: string | null;

  /*
   * Components now come from the backend.
   */
  components: Component[];

  cart: CartItem[];

  orders: Order[];

  notifications: Notification[];

  /*
   * AUTH
   */
  register: (
    data: Omit<User, "id" | "role">
  ) => {
    ok: boolean;
    error?: string;
  };

  login: (
    email: string,
    password: string
  ) => {
    ok: boolean;
    role?: Role;
    error?: string;
  };

  logout: () => void;

  /*
   * COMPONENTS
   *
   * These are used after fetching data
   * from the backend.
   */
  setComponents: (components: Component[]) => void;

  addComponent: (component: Component) => void;

  updateComponent: (
    id: string,
    patch: Partial<Component>
  ) => void;

  deleteComponent: (id: string) => void;

  /*
   * CART
   */
  addToCart: (
    componentId: string,
    qty?: number
  ) => void;

  setQuantity: (
    componentId: string,
    qty: number
  ) => void;

  removeFromCart: (
    componentId: string
  ) => void;

  clearCart: () => void;

  /*
   * ORDERS
   */
  placeOrder: () => Order | null;

  updateOrderStatus: (
    orderId: string,
    status: OrderStatus
  ) => void;

  /*
   * NOTIFICATIONS
   */
  markNotificationRead: (
    id: string
  ) => void;
}

/*
 * Temporary local admin account.
 *
 * You can later move authentication completely
 * to your backend as well.
 */
const ADMIN: User = {
  id: "admin-seed",
  fullName: "Lab Administrator",
  email: "admin@elizade.edu.ng",
  matric: "ADMIN",
  password: "admin123",
  role: "admin",
};

function uid(prefix = "") {
  return (
    prefix +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      /*
       * INITIAL STATE
       */

      users: [ADMIN],

      currentUserId: null,

      /*
       * IMPORTANT:
       * No SEED_COMPONENTS here.
       *
       * Components are populated by:
       *
       * GET /components
       */
      components: [],

      cart: [],

      orders: [],

      notifications: [],

      /*
       * ==========================================
       * AUTH
       * ==========================================
       */

      register: (data) => {
        const exists = get().users.some(
          (u) =>
            u.email.toLowerCase() ===
            data.email.toLowerCase()
        );

        if (exists) {
          return {
            ok: false,
            error:
              "An account with this email already exists.",
          };
        }

        const newUser: User = {
          ...data,
          id: uid("u-"),
          role: "student",
        };

        set({
          users: [
            ...get().users,
            newUser,
          ],
        });

        return {
          ok: true,
        };
      },

      login: (email, password) => {
        const user = get().users.find(
          (u) =>
            u.email.toLowerCase() ===
              email.toLowerCase() &&
            u.password === password
        );

        if (!user) {
          return {
            ok: false,
            error:
              "Invalid email or password.",
          };
        }

        set({
          currentUserId: user.id,
        });

        return {
          ok: true,
          role: user.role,
        };
      },

      logout: () => {
        set({
          currentUserId: null,
        });
      },

      /*
       * ==========================================
       * COMPONENTS
       * ==========================================
       */

      /*
       * Replace all components in the store.
       *
       * Called when the user page fetches:
       *
       * GET /components
       */
      setComponents: (components) => {
        set({
          components,
        });
      },

      /*
       * Add a component to the local store.
       *
       * The ADMIN page should normally call the
       * backend first, then use this with the
       * response from the backend.
       */
      addComponent: (component) => {
        set({
          components: [
            component,
            ...get().components,
          ],
        });
      },

      /*
       * Update local component state.
       *
       * Backend should be updated first.
       */
      updateComponent: (
        id,
        patch
      ) => {
        set({
          components:
            get().components.map(
              (component) =>
                component.id === id
                  ? {
                      ...component,
                      ...patch,
                    }
                  : component
            ),
        });
      },

      /*
       * Remove component from local state.
       *
       * Backend should be deleted first.
       */
      deleteComponent: (id) => {
        set({
          components:
            get().components.filter(
              (component) =>
                component.id !== id
            ),
        });
      },

      /*
       * ==========================================
       * CART
       * ==========================================
       */

      addToCart: (
        componentId,
        qty = 1
      ) => {
        const existing =
          get().cart.find(
            (item) =>
              item.componentId ===
              componentId
          );

        if (existing) {
          set({
            cart: get().cart.map(
              (item) =>
                item.componentId ===
                componentId
                  ? {
                      ...item,
                      quantity:
                        item.quantity +
                        qty,
                    }
                  : item
            ),
          });
        } else {
          set({
            cart: [
              ...get().cart,
              {
                componentId,
                quantity: qty,
              },
            ],
          });
        }
      },

      setQuantity: (
        componentId,
        qty
      ) => {
        if (qty <= 0) {
          get().removeFromCart(
            componentId
          );

          return;
        }

        set({
          cart: get().cart.map(
            (item) =>
              item.componentId ===
              componentId
                ? {
                    ...item,
                    quantity: qty,
                  }
                : item
          ),
        });
      },

      removeFromCart: (
        componentId
      ) => {
        set({
          cart: get().cart.filter(
            (item) =>
              item.componentId !==
              componentId
          ),
        });
      },

      clearCart: () => {
        set({
          cart: [],
        });
      },

      /*
       * ==========================================
       * ORDERS
       * ==========================================
       */

      placeOrder: () => {
        const {
          currentUserId,
          users,
          cart,
          components,
          orders,
        } = get();

        if (
          !currentUserId ||
          cart.length === 0
        ) {
          return null;
        }

        const user = users.find(
          (u) =>
            u.id === currentUserId
        );

        if (!user) {
          return null;
        }

        const items = cart
          .map((cartItem) => {
            const component =
              components.find(
                (c) =>
                  c.id ===
                  cartItem.componentId
              );

            if (!component) {
              return null;
            }

            return {
              componentId:
                component.id,
              name: component.name,
              quantity:
                cartItem.quantity,
              price: component.price,
            };
          })
          .filter(
            (
              item
            ): item is {
              componentId: string;
              name: string;
              quantity: number;
              price: number;
            } => item !== null
          );

        if (items.length === 0) {
          return null;
        }

        const total =
          items.reduce(
            (sum, item) =>
              sum +
              item.price *
                item.quantity,
            0
          );

        const order: Order = {
          id:
            "EU-" +
            Math.floor(
              10000 +
                Math.random() *
                  90000
            ),

          userId: user.id,

          userName:
            user.fullName,

          matric: user.matric,

          items,

          total,

          status: "Paid",

          createdAt: Date.now(),
        };

        /*
         * Update local stock.
         *
         * IMPORTANT:
         * For a real production application,
         * stock should eventually be updated
         * through the backend/database too.
         */
        const updatedComponents =
          components.map(
            (component) => {
              const item =
                items.find(
                  (i) =>
                    i.componentId ===
                    component.id
                );

              return item
                ? {
                    ...component,
                    stock: Math.max(
                      0,
                      component.stock -
                        item.quantity
                    ),
                  }
                : component;
            }
          );

        set({
          orders: [
            order,
            ...orders,
          ],

          components:
            updatedComponents,

          cart: [],
        });

        return order;
      },

      /*
       * ==========================================
       * ORDER STATUS
       * ==========================================
       */

      updateOrderStatus: (
        orderId,
        status
      ) => {
        const order =
          get().orders.find(
            (o) =>
              o.id === orderId
          );

        set({
          orders:
            get().orders.map(
              (o) =>
                o.id === orderId
                  ? {
                      ...o,
                      status,
                    }
                  : o
            ),
        });

        if (!order) {
          return;
        }

        const message =
          status === "Preparing"
            ? `Your order ${orderId} is being prepared.`
            : status === "Ready"
            ? `Order ${orderId} is ready for pickup at the lab.`
            : status === "Collected"
            ? `Order ${orderId} has been collected. Thank you!`
            : `Order ${orderId} status updated.`;

        set({
          notifications: [
            {
              id: uid("n-"),
              userId:
                order.userId,
              message,
              orderId,
              read: false,
              createdAt:
                Date.now(),
            },

            ...get()
              .notifications,
          ],
        });
      },

      /*
       * ==========================================
       * NOTIFICATIONS
       * ==========================================
       */

      markNotificationRead: (
        id
      ) => {
        set({
          notifications:
            get().notifications.map(
              (notification) =>
                notification.id === id
                  ? {
                      ...notification,
                      read: true,
                    }
                  : notification
            ),
        });
      },
    }),

    {
      name: "pulselab-store-v1",

      /*
       * We intentionally keep components
       * persisted for now.
       *
       * The backend remains the source of truth,
       * and the components page will refresh
       * them from MongoDB.
       */
    }
  )
);

/*
 * ==========================================
 * CURRENT USER
 * ==========================================
 */

export function useCurrentUser() {
  return useStore(
    (state) =>
      state.users.find(
        (user) =>
          user.id ===
          state.currentUserId
      ) || null
  );
}

/*
 * ==========================================
 * FORMAT NAIRA
 * ==========================================
 */

export function formatNaira(
  amount: number
) {
  return (
    "₦" +
    amount.toLocaleString("en-NG")
  );
}