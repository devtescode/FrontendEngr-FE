import type { ComponentSortField, SortOrder } from "./api";

/* ============================================================
   QUERY KEYS
   ------------------------------------------------------------
   One factory for every key in the app, so invalidation is
   always exact.

   User-scoped keys include the user id. Two accounts signed in
   on the same browser must never read each other's cart or
   orders, and a logout/login cycle must not resurrect the
   previous user's data.
   ============================================================ */

export type ComponentListParams = {
  page: number;
  limit: number;
  sort: ComponentSortField;
  order: SortOrder;
  search: string;
  category?: string;
};

export type CollectedListParams = {
  page: number;
  limit: number;
  q: string;
  sort: string;
};

export const queryKeys = {
  /* ---------------- catalog (public) ---------------- */

  components: {
    all: ["components"] as const,
    lists: () => [...queryKeys.components.all, "list"] as const,
    list: (params: ComponentListParams) =>
      [...queryKeys.components.lists(), params] as const,
    detail: (id: string) =>
      [...queryKeys.components.all, "detail", id] as const,
    /** The admin inventory table needs every row (SKU allocation). */
    adminList: () =>
      [...queryKeys.components.all, "admin-list"] as const,
  },

  /* ---------------- cart (student scoped) ---------------- */

  cart: {
    all: ["cart"] as const,
    detail: (userId: string) =>
      [...queryKeys.cart.all, userId] as const,
  },

  /* ---------------- orders (student scoped) ---------------- */

  orders: {
    all: ["orders"] as const,
    list: (userId: string) =>
      [...queryKeys.orders.all, userId] as const,
    detail: (userId: string, orderId: string) =>
      [...queryKeys.orders.all, userId, "detail", orderId] as const,
  },

  /* ---------------- profile (student scoped) ---------------- */

  profile: {
    all: ["profile"] as const,
    me: (userId: string) => [...queryKeys.profile.all, userId] as const,
  },

  /* ---------------- admin ---------------- */

  admin: {
    all: ["admin"] as const,
    overview: () => [...queryKeys.admin.all, "overview"] as const,
    users: () => [...queryKeys.admin.all, "users"] as const,
    carts: () => [...queryKeys.admin.all, "carts"] as const,
    /**
     * Without params: the prefix shared by every collected page, so
     * `invalidateQueries({ queryKey: queryKeys.admin.collected() })`
     * refreshes all of them. With params: one specific page.
     */
    collected: (params?: CollectedListParams) =>
      params
        ? ([...queryKeys.admin.all, "collected", params] as const)
        : ([...queryKeys.admin.all, "collected"] as const),
    pickupSearch: (query: string) =>
      [...queryKeys.admin.all, "pickup", "search", query] as const,
  },
} as const;
