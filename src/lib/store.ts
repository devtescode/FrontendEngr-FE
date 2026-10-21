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

/* ============================================================
   ORDERS — mirrors the PaymentOrder Mongo schema
   • PaymentOrder.amount       → KOBO  (integer)
   • PaymentOrder.items[].price → NAIRA (plain number)
============================================================ */

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";
export type PickupStatus = "Paid" | "Ready" | "Collected";

export interface OrderItem {
  componentId: string;
  name?: string;
  /** price in naira (matches PaymentOrder.items[].price) */
  price: number;
  quantity: number;
  /** image url — present when the server populates items[].componentId */
  image?: string | null;
  /** sku — present when the server populates items[].componentId */
  sku?: string | null;
}

export interface PaymentOrder {
  id: string;
  reference: string;
  userId: string;

  items: OrderItem[];

  /** raw amount in kobo (server field: `amount`) */
  amountKobo?: number;
  amount?: number;
  /** derived amount in naira (amountKobo / 100) */
  amountNaira: number;

  currency?: string;

  paymentStatus: PaymentStatus;
  pickupStatus?: PickupStatus | null;

  paystackTransactionId?: string;
  paystackChannel?: string;
  paystackGatewayResponse?: string;
  paystackFees?: number;
  paystackPaidAt?: string;
  paidAt?: string;
  collectedAt?: string;

  createdAt: string;
  updatedAt: string;

  /** convenience: sum of item quantities */
  itemCount?: number;
}

/** @deprecated Use `PaymentOrder`. */
export type Order = PaymentOrder;

/** @deprecated Use `PaymentStatus` / `PickupStatus`. */
export type OrderStatus = PaymentStatus | PickupStatus;

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
  components: Component[];
  cart: CartItem[];
  orders: PaymentOrder[];
  notifications: Notification[];

  register: (
    data: Omit<User, "id" | "role">
  ) => { ok: boolean; error?: string };

  login: (
    email: string,
    password: string
  ) => { ok: boolean; role?: Role; error?: string };

  logout: () => void;

  setComponents: (components: Component[]) => void;
  addComponent: (component: Component) => void;
  updateComponent: (id: string, patch: Partial<Component>) => void;
  deleteComponent: (id: string) => void;

  addToCart: (componentId: string, qty?: number) => void;
  setQuantity: (componentId: string, qty: number) => void;
  removeFromCart: (componentId: string) => void;
  clearCart: () => void;

  placeOrder: () => PaymentOrder | null;
  updateOrderStatus: (orderId: string, status: PickupStatus) => void;

  markNotificationRead: (id: string) => void;
}

const ADMIN: User = {
  id: "admin",
  fullName: "Lab Administrator",
  email: "",
  matric: "",
  password: "admin123",
  role: "admin",
};

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/* ============================================================
   ORDER NORMALIZERS
   Use these whenever data comes from the API or socket so the
   store only ever holds fully-formed PaymentOrders.
============================================================ */

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const safeStr = (v: unknown, fb = "") => {
  if (v == null) return fb;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (isObj(v)) {
    if (v._id != null) return String(v._id);
    if (v.id != null) return String(v.id);
  }
  return String(v);
};
const safeNum = (v: unknown, fb = 0) => {
  if (v == null) return fb;
  if (typeof v === "number") return Number.isFinite(v) ? v : fb;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
};
const safeNullStr = (v: unknown) => {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (isObj(v)) {
    if (v.url != null) return safeNullStr(v.url);
    if (v.src != null) return safeNullStr(v.src);
    if (v.image != null) return safeNullStr(v.image);
  }
  return null;
};
const pickObj = (obj: any, keys: string[]) => {
  if (!isObj(obj)) return null;
  for (const k of keys) {
    if (isObj(obj[k])) return obj[k];
  }
  return null;
};

export function normalizeOrderItem(raw: any): OrderItem {
  if (!isObj(raw)) return { componentId: "", name: "", price: 0, quantity: 0, image: null, sku: null };
  const populated =
    raw.componentId && isObj(raw.componentId)
      ? raw.componentId
      : pickObj(raw, ["component", "product", "item"]);

  const componentId = safeStr(
    populated?._id ?? populated?.id ?? raw.componentId ?? raw.componentId?._id,
    ""
  );

  const name = safeStr(raw.name ?? populated?.name ?? "", "");
  const price = safeNum(raw.price ?? populated?.price ?? raw.unitPrice ?? raw.amount ?? 0, 0);
  const quantity = safeNum(raw.quantity ?? raw.qty ?? raw.count ?? 0, 0);

  const image = safeNullStr(populated?.image ?? populated?.thumbnail ?? raw.image ?? raw.thumbnail) ?? null;
  const sku = safeNullStr(populated?.sku ?? raw.sku ?? "") ?? null;

  return {
    componentId,
    name,
    price,
    quantity,
    image,
    sku,
  };
}

export function normalizeOrder(raw: any): PaymentOrder {
  const source = isObj(raw) ? raw : {};
  const amountKobo = Math.round(safeNum(source.amountKobo ?? source.amount ?? source.totalKobo ?? 0, 0));
  const items: OrderItem[] = Array.isArray(source.items)
    ? source.items
        .map(normalizeOrderItem)
        .filter((i: OrderItem) => i.componentId !== "" && i.quantity > 0)
    : [];

  const totalFromItemsNaira = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const amountNaira = amountKobo > 0 ? amountKobo / 100 : totalFromItemsNaira;

  const userId = safeStr(
    source.userId?._id ?? source.userId ?? source.buyerId ?? source.customerId ?? "",
    ""
  );

  const itemCount =
    typeof source.itemCount === "number" && Number.isFinite(source.itemCount)
      ? source.itemCount
      : items.reduce((s, i) => s + i.quantity, 0);

  return {
    id: safeStr(source.id ?? source._id ?? source.orderId ?? "", ""),
    reference: safeStr(source.reference ?? source.ref ?? "", ""),
    userId,
    items,
    amountKobo,
    amountNaira,
    currency: safeStr(source.currency ?? "NGN", "NGN"),
    paymentStatus: (source.paymentStatus as PaymentStatus) ?? "pending",
    pickupStatus: source.pickupStatus ?? null,
    paystackTransactionId: source.paystackTransactionId,
    paystackChannel: source.paystackChannel,
    paystackGatewayResponse: source.paystackGatewayResponse,
    paystackFees: source.paystackFees,
    paystackPaidAt: source.paystackPaidAt,
    paidAt: source.paidAt,
    collectedAt: source.collectedAt,
    createdAt: safeStr(source.createdAt ?? source.created_at ?? new Date().toISOString(), new Date().toISOString()),
    updatedAt: safeStr(source.updatedAt ?? source.updated_at ?? new Date().toISOString(), new Date().toISOString()),
    itemCount,
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [ADMIN],
      currentUserId: null,
      components: [],
      cart: [],
      orders: [],
      notifications: [],

      /* ==================== AUTH ==================== */

      register: (data) => {
        const exists = get().users.some(
          (u) => u.email.toLowerCase() === data.email.toLowerCase()
        );
        if (exists) {
          return {
            ok: false,
            error: "An account with this email already exists.",
          };
        }
        const newUser: User = { ...data, id: uid("u-"), role: "student" };
        set({ users: [...get().users, newUser] });
        return { ok: true };
      },

      login: (email, password) => {
        const user = get().users.find(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.password === password
        );
        if (!user) return { ok: false, error: "Invalid email or password." };
        set({ currentUserId: user.id });
        return { ok: true, role: user.role };
      },

      logout: () => set({ currentUserId: null }),

      /* ================== COMPONENTS ================== */

      setComponents: (components) => set({ components }),

      addComponent: (component) =>
        set({ components: [component, ...get().components] }),

      updateComponent: (id, patch) =>
        set({
          components: get().components.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        }),

      deleteComponent: (id) =>
        set({
          components: get().components.filter((c) => c.id !== id),
        }),

      /* ==================== CART ==================== */

      addToCart: (componentId, qty = 1) => {
        const existing = get().cart.find(
          (i) => i.componentId === componentId
        );
        if (existing) {
          set({
            cart: get().cart.map((i) =>
              i.componentId === componentId
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          });
        } else {
          set({ cart: [...get().cart, { componentId, quantity: qty }] });
        }
      },

      setQuantity: (componentId, qty) => {
        if (qty <= 0) return get().removeFromCart(componentId);
        set({
          cart: get().cart.map((i) =>
            i.componentId === componentId ? { ...i, quantity: qty } : i
          ),
        });
      },

      removeFromCart: (componentId) =>
        set({
          cart: get().cart.filter((i) => i.componentId !== componentId),
        }),

      clearCart: () => set({ cart: [] }),

      /* ==================== ORDERS ==================== */

      placeOrder: () => {
        const { currentUserId, users, cart, components, orders } = get();
        if (!currentUserId || cart.length === 0) return null;

        const user = users.find((u) => u.id === currentUserId);
        if (!user) return null;

        const items: OrderItem[] = cart
          .map((cartItem): OrderItem | null => {
            const component = components.find(
              (c) => c.id === cartItem.componentId
            );
            if (!component) return null;
            return {
              componentId: component.id ?? "",
              name: component.name,
              price: component.price, // naira (matches backend)
              quantity: cartItem.quantity,
            };
          })
          .filter(
            (i: OrderItem | null): i is OrderItem =>
              i !== null && i.componentId !== ""
          );

        if (items.length === 0) return null;

        const totalNaira = items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        );

        const now = new Date().toISOString();

        // NOTE: local placeholder. In production the real order is
        // created server-side via Paystack + webhook.
        const order: PaymentOrder = {
          id: "EU-" + Math.floor(10000 + Math.random() * 90000),
          reference: "local-" + uid(),
          userId: user.id,
          items,
          amountKobo: Math.round(totalNaira * 100),
          amountNaira: totalNaira,
          currency: "NGN",
          paymentStatus: "paid",
          pickupStatus: "Paid",
          createdAt: now,
          updatedAt: now,
          itemCount: items.reduce((s, i) => s + i.quantity, 0),
        };

        const updatedComponents = components.map((component) => {
          const item = items.find((i) => i.componentId === component.id);
          return item
            ? {
                ...component,
                stock: Math.max(0, component.stock - item.quantity),
              }
            : component;
        });

        set({
          orders: [order, ...orders],
          components: updatedComponents,
          cart: [],
        });

        return order;
      },

      updateOrderStatus: (orderId, status) => {
        const order = get().orders.find((o) => o.id === orderId);

        set({
          orders: get().orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  pickupStatus: status,
                  updatedAt: new Date().toISOString(),
                }
              : o
          ),
        });

        if (!order) return;

        const message =
          status === "Ready"
            ? `Order ${order.reference} is ready for pickup at the lab.`
            : status === "Collected"
            ? `Order ${order.reference} has been collected. Thank you!`
            : `Order ${order.reference} status updated.`;

        set({
          notifications: [
            {
              id: uid("n-"),
              userId: order.userId,
              message,
              orderId,
              read: false,
              createdAt: Date.now(),
            },
            ...get().notifications,
          ],
        });
      },

      /* ================= NOTIFICATIONS ================= */

      markNotificationRead: (id) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }),
    }),

    { name: "pulselab-store-v1" }
  )
);

export function useCurrentUser() {
  return useStore(
    (state) =>
      state.users.find((user) => user.id === state.currentUserId) || null
  );
}

export function formatNaira(amount: number) {
  return "₦" + amount.toLocaleString("en-NG");
}