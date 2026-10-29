import { useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiRequest } from "@/lib/apiClient";
import { getAdminToken } from "@/lib/auth";
import { componentApi, type BackendComponent } from "@/lib/api";
import {
  extractOrders,
  httpsUrlOrNull,
  normalizeOrder,
  type NormalizedOrder,
} from "@/lib/normalize";
import { queryKeys } from "@/lib/queryKeys";

export type AdminOverview = {
  orders: NormalizedOrder[];
  components: BackendComponent[];
  userCount: number;
};

export type AdminUser = {
  _id: string;
  id: string;
  fullName: string;
  email: string;
  matric: string;
  phoneNumber: string;
  gender: string;
  role: string;
  /** not returned by the API today, kept for the existing UI */
  level?: string | number;
  /** Cloudinary https URL; undefined when the student has no photo */
  profileImageUrl?: string;
  /** ISO registration timestamp; undefined when no valid source exists */
  createdAt?: string;
};

/**
 * Registration date as ISO: the backend `createdAt` when valid, else the
 * timestamp embedded in a 24-hex Mongo ObjectId (legacy docs).
 */
function toRegisteredAt(createdAt: unknown, id: string): string | undefined {
  if (typeof createdAt === "string" || typeof createdAt === "number") {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (/^[0-9a-f]{24}$/i.test(id)) {
    const d = new Date(parseInt(id.slice(0, 8), 16) * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

export type AdminCart = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    matric: string;
    profileImageUrl: string | null;
  } | null;
  items: {
    componentId: {
      _id: string;
      name: string;
      sku: string;
      price: number;
      image: string;
      category: string;
    };
    quantity: number;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type PickupStatus = "Paid" | "Ready" | "Collected";

function adminEnabled(): boolean {
  return Boolean(getAdminToken());
}

/* ============================================================
   QUERIES
   ============================================================ */

export function useAdminOverview() {
  const query = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: async ({ signal }): Promise<AdminOverview> => {
      const raw = await apiRequest<any>("/admin/overview", {
        auth: "admin",
        signal,
      });

      const components: BackendComponent[] = Array.isArray(raw?.components)
        ? raw.components.map((c: any) => ({
            ...c,
            _id: String(c._id ?? c.id ?? ""),
            stock: Number(c.stock ?? 0),
          }))
        : [];

      return {
        orders: extractOrders(raw?.orders ?? []),
        components,
        userCount: Number(raw?.userCount ?? 0),
      };
    },
    enabled: adminEnabled(),
    staleTime: 15_000,
  });

  // The fallbacks are memoised so their identity only changes when the
  // data actually changes. Returning a fresh `[]` on every render would
  // re-trigger any effect that depends on them.
  const orders = useMemo(() => query.data?.orders ?? [], [query.data]);
  const components = useMemo(
    () => query.data?.components ?? [],
    [query.data]
  );

  return {
    overview: query.data,
    orders,
    components,
    userCount: query.data?.userCount ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAdminUsers() {
  const query = useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: async ({ signal }): Promise<AdminUser[]> => {
      const raw = await apiRequest<any>("/admin/getallusers", {
        auth: "admin",
        signal,
      });

      if (!Array.isArray(raw?.users)) return [];

      return raw.users.map((u: any) => ({
        _id: String(u._id ?? u.id ?? ""),
        id: String(u.id ?? u._id ?? ""),
        fullName: u.fullName ?? "",
        email: u.email ?? "",
        matric: u.matric ?? "",
        phoneNumber: u.phoneNumber ?? "",
        gender: u.gender ?? "",
        role: u.role ?? "student",
        profileImageUrl:
          typeof u.profileImageUrl === "string" &&
          u.profileImageUrl.startsWith("https://")
            ? u.profileImageUrl
            : undefined,
        createdAt: toRegisteredAt(u.createdAt, String(u._id ?? u.id ?? "")),
      }));
    },
    enabled: adminEnabled(),
    staleTime: 30_000,
  });

  return {
    users: useMemo(() => query.data ?? [], [query.data]),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAdminCarts() {
  const query = useQuery({
    queryKey: queryKeys.admin.carts(),
    queryFn: async ({ signal }): Promise<AdminCart[]> => {
      const raw = await apiRequest<any>("/admin/getallcarts", {
        auth: "admin",
        signal,
      });

      if (!Array.isArray(raw?.carts)) return [];

      return raw.carts.map((c: any) => ({
        _id: String(c._id ?? ""),
        userId: c.userId
          ? {
              _id: String(c.userId._id ?? c.userId.id ?? ""),
              fullName: c.userId.fullName ?? "",
              email: c.userId.email ?? "",
              matric: c.userId.matric ?? "",
              profileImageUrl: httpsUrlOrNull(c.userId.profileImageUrl),
            }
          : null,
        items: Array.isArray(c.items)
          ? c.items
              // A cart line whose component was deleted has nothing to
              // render — it is dropped rather than crashing the table.
              .filter((i: any) => Boolean(i?.componentId))
              .map((i: any) => ({
                componentId: {
                  _id: String(i.componentId._id ?? ""),
                  name: i.componentId.name ?? "",
                  sku: i.componentId.sku ?? "",
                  price: Number(i.componentId.price ?? 0),
                  image: i.componentId.image ?? "",
                  category: i.componentId.category ?? "",
                },
                quantity: Number(i.quantity ?? 0),
              }))
          : [],
        createdAt: c.createdAt ?? "",
        updatedAt: c.updatedAt ?? "",
      }));
    },
    enabled: adminEnabled(),
    staleTime: 15_000,
  });

  return {
    carts: useMemo(() => query.data ?? [], [query.data]),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export type CollectedSort = "recent" | "oldest" | "highest";

export type CollectedPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type CollectedStats = {
  /** number of collected orders in the filtered set */
  orders: number;
  /** distinct students in the filtered set */
  students: number;
  /** sum of item quantities */
  items: number;
  /** total value in naira */
  value: number;
};

type CollectedPage = {
  orders: NormalizedOrder[];
  pagination: CollectedPagination;
  stats: CollectedStats;
};

const EMPTY_COLLECTED_STATS: CollectedStats = {
  orders: 0,
  students: 0,
  items: 0,
  value: 0,
};

const nonNegInt = (v: unknown, fb: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fb;
};

export function useAdminCollected({
  page,
  limit = 4,
  q = "",
  sort = "recent",
}: {
  page: number;
  limit?: number;
  q?: string;
  sort?: CollectedSort;
}) {
  const trimmed = q.trim();
  const params = { page, limit, q: trimmed, sort };

  const query = useQuery({
    queryKey: queryKeys.admin.collected(params),
    queryFn: async ({ signal }): Promise<CollectedPage> => {
      const raw = await apiRequest<any>("/admin/pickup/collected", {
        auth: "admin",
        signal,
        query: { page, limit, q: trimmed, sort },
      });

      const orders = extractOrders(raw?.orders ?? []);
      const p = raw?.pagination;
      const s = raw?.stats;

      return {
        orders,
        pagination: {
          page: Math.max(1, nonNegInt(p?.page, page)),
          limit: Math.max(1, nonNegInt(p?.limit, limit)),
          totalItems: nonNegInt(p?.totalItems, orders.length),
          totalPages: nonNegInt(p?.totalPages, orders.length > 0 ? 1 : 0),
        },
        stats: {
          orders: nonNegInt(s?.orders, 0),
          students: nonNegInt(s?.students, 0),
          items: nonNegInt(s?.items, 0),
          value: Number.isFinite(Number(s?.value)) ? Number(s.value) : 0,
        },
      };
    },
    enabled: adminEnabled(),
    staleTime: 15_000,
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  const orders = useMemo(() => query.data?.orders ?? [], [query.data]);

  const pagination = useMemo<CollectedPagination>(
    () =>
      query.data?.pagination ?? {
        page,
        limit,
        totalItems: 0,
        totalPages: 0,
      },
    [query.data, page, limit]
  );

  return {
    orders,
    pagination,
    stats: query.data?.stats ?? EMPTY_COLLECTED_STATS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isPlaceholderData: query.isPlaceholderData,
  };
}

export function usePickupSearch(query: string) {
  const trimmed = query.trim();

  const result = useQuery({
    queryKey: queryKeys.admin.pickupSearch(trimmed),
    queryFn: async ({ signal }): Promise<NormalizedOrder[]> => {
      const raw = await apiRequest<any>("/admin/pickup/search", {
        auth: "admin",
        signal,
        query: { q: trimmed },
      });

      return extractOrders(raw?.orders ?? []);
    },
    enabled: adminEnabled() && trimmed.length >= 2,
    staleTime: 10_000,
  });

  return {
    results: useMemo(() => result.data ?? [], [result.data]),
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
}

/* ============================================================
   MUTATIONS
   ============================================================ */

export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      orderId: string;
      status: PickupStatus;
    }) => {
      return apiRequest<{
        message?: string;
        pickupStatus?: string;
        collectedAt?: string | null;
      }>(`/admin/pickup/${variables.orderId}/status`, {
        method: "PUT",
        auth: "admin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: variables.status }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Inventory mutations. Every write invalidates the public catalog, the
 * admin inventory list, the admin overview and the cart snapshots that
 * embed component names and prices.
 */
export function useComponentMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.components.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
  };

  const create = useMutation({
    mutationFn: async (variables: {
      data: Parameters<typeof componentApi.create>[0];
      imageFile?: File | null;
    }) => {
      return componentApi.create(variables.data, variables.imageFile);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (variables: {
      id: string;
      data: Parameters<typeof componentApi.update>[1];
      imageFile?: File | null;
    }) => {
      return componentApi.update(
        variables.id,
        variables.data,
        variables.imageFile
      );
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (variables: { id: string }) => {
      return componentApi.delete(variables.id);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export { normalizeOrder };
