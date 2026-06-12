import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_COMPONENTS, type Component } from "./data";

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

export type OrderStatus = "Paid" | "Preparing" | "Ready" | "Collected";
export interface Order {
  id: string;
  userId: string;
  userName: string;
  matric: string;
  items: { componentId: string; name: string; quantity: number; price: number }[];
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
  components: Component[];
  cart: CartItem[];
  orders: Order[];
  notifications: Notification[];

  register: (data: Omit<User, "id" | "role">) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; role?: Role; error?: string };
  logout: () => void;

  addToCart: (componentId: string, qty?: number) => void;
  setQuantity: (componentId: string, qty: number) => void;
  removeFromCart: (componentId: string) => void;
  clearCart: () => void;

  placeOrder: () => Order | null;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  addComponent: (c: Omit<Component, "id">) => void;
  updateComponent: (id: string, patch: Partial<Component>) => void;
  deleteComponent: (id: string) => void;

  markNotificationRead: (id: string) => void;
}

const ADMIN: User = {
  id: "admin-seed",
  fullName: "Lab Administrator",
  email: "admin@elizade.edu.ng",
  matric: "ADMIN",
  password: "admin123",
  role: "admin",
};

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [ADMIN],
      currentUserId: null,
      components: SEED_COMPONENTS,
      cart: [],
      orders: [],
      notifications: [],
      

      register: (data) => {
        const exists = get().users.some((u) => u.email.toLowerCase() === data.email.toLowerCase());
        if (exists) return { ok: false, error: "An account with this email already exists." };
        const newUser: User = { ...data, id: uid("u-"), role: "student" };
        set({ users: [...get().users, newUser] });
        return { ok: true };
      },

      login: (email, password) => {
        const u = get().users.find(
          (x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password,
        );
        if (!u) return { ok: false, error: "Invalid email or password." };
        set({ currentUserId: u.id });
        return { ok: true, role: u.role };
      },

      logout: () => set({ currentUserId: null }),

      addToCart: (componentId, qty = 1) => {
        const existing = get().cart.find((c) => c.componentId === componentId);
        if (existing) {
          set({
            cart: get().cart.map((c) =>
              c.componentId === componentId ? { ...c, quantity: c.quantity + qty } : c,
            ),
          });
        } else {
          set({ cart: [...get().cart, { componentId, quantity: qty }] });
        }
      },
      setQuantity: (componentId, qty) => {
        if (qty <= 0) return get().removeFromCart(componentId);
        set({
          cart: get().cart.map((c) => (c.componentId === componentId ? { ...c, quantity: qty } : c)),
        });
      },
      removeFromCart: (componentId) =>
        set({ cart: get().cart.filter((c) => c.componentId !== componentId) }),
      clearCart: () => set({ cart: [] }),

      placeOrder: () => {
        const { currentUserId, users, cart, components, orders } = get();
        if (!currentUserId || cart.length === 0) return null;
        const user = users.find((u) => u.id === currentUserId)!;
        const items = cart.map((ci) => {
          const c = components.find((c) => c.id === ci.componentId)!;
          return { componentId: c.id, name: c.name, quantity: ci.quantity, price: c.price };
        });
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
        const order: Order = {
          id: "EU-" + Math.floor(10000 + Math.random() * 90000),
          userId: user.id,
          userName: user.fullName,
          matric: user.matric,
          items,
          total,
          status: "Paid",
          createdAt: Date.now(),
        };
        // Reduce stock
        const updatedComponents = components.map((c) => {
          const item = items.find((i) => i.componentId === c.id);
          return item ? { ...c, stock: Math.max(0, c.stock - item.quantity) } : c;
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
        set({ orders: get().orders.map((o) => (o.id === orderId ? { ...o, status } : o)) });
        if (order) {
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
                userId: order.userId,
                message,
                orderId,
                read: false,
                createdAt: Date.now(),
              },
              ...get().notifications,
            ],
          });
        }
      },

      addComponent: (c) => set({ components: [{ ...c, id: uid("c-") }, ...get().components] }),
      updateComponent: (id, patch) =>
        set({ components: get().components.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
      deleteComponent: (id) =>
        set({ components: get().components.filter((c) => c.id !== id) }),

      markNotificationRead: (id) =>
        set({
          notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }),
    }),
    { name: "pulselab-store-v1" },
  ),
);

export function useCurrentUser() {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId) || null);
}



export function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}