import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/apiClient";
import { getAdminToken } from "@/lib/auth";
import { componentApi, type BackendComponent } from "@/lib/api";
import {
  extractOrders,
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
};

export type AdminCart = {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    matric: string;
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

export function useAdminCollected() {
  const query = useQuery({
    queryKey: queryKeys.admin.collected(),
    queryFn: async ({ signal }): Promise<NormalizedOrder[]> => {
      const raw = await apiRequest<any>("/admin/pickup/collected", {
        auth: "admin",
        signal,
      });

      return extractOrders(raw?.orders ?? []);
    },
    enabled: adminEnabled(),
    staleTime: 15_000,
  });

  return {
    orders: useMemo(() => query.data ?? [], [query.data]),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
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
