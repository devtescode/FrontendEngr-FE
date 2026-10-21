import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getCurrentUser, type SessionUser } from "./auth";

/* ============================================================
   APP STATE
   ------------------------------------------------------------
   This store holds CLIENT state only.

   Server state (components, orders, users, cart) lives in
   React Query, keyed per user, and is never written to
   localStorage. Previously this store persisted the full
   catalog, every order and the user list — including
   plaintext passwords — to localStorage, where they survived
   a sign-out and leaked into the next account.
   ============================================================ */

export type Role = "student" | "admin";

export interface User {
  id: string;
  fullName: string;
  email: string;
  matric: string;
  role: Role;
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
  currentUserId: string | null;
  notifications: Notification[];

  logout: () => void;

  markNotificationRead: (id: string) => void;
}

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      notifications: [],

      /* ==================== AUTH ==================== */

      logout: () => set({ currentUserId: null }),

      /* ================= NOTIFICATIONS ================= */

      markNotificationRead: (id) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }),
    }),
    {
      name: "pulselab-store-v1",
      // Only the session id and the local notification list are
      // persisted. Nothing that came from the server is.
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        notifications: state.notifications,
      }),
    }
  )
);

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * The signed-in user, read from the session.
 *
 * The store used to hold this, but it only ever contained
 * locally mocked accounts, so it was `null` for every real
 * student.
 */
export function useCurrentUser(): SessionUser | null {
  return getCurrentUser();
}

export function formatNaira(amount: number) {
  return `₦${Number(amount ?? 0).toLocaleString("en-NG")}`;
}

export { uid };
