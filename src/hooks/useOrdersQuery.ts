import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/apiClient";
import { getCurrentUserId, getUserToken } from "@/lib/auth";
import {
  extractOrders,
  normalizeOrder,
  type NormalizedOrder,
} from "@/lib/normalize";
import { queryKeys } from "@/lib/queryKeys";

const ANONYMOUS = "anonymous";

function useOrdersKey(): string {
  return getCurrentUserId() ?? ANONYMOUS;
}

/**
 * The student's paid orders.
 *
 * `/orders` and `/receipts` both read this query, so the list is fetched
 * once and shared by both pages.
 */
export function useOrdersQuery() {
  const userId = useOrdersKey();
  const token = getUserToken();

  const query = useQuery({
    queryKey: queryKeys.orders.list(userId),
    queryFn: async ({ signal }): Promise<NormalizedOrder[]> => {
      const raw = await apiRequest("/engineering/getorders", {
        auth: "user",
        signal,
      });

      return extractOrders(raw);
    },
    enabled: Boolean(token) && userId !== ANONYMOUS,
    staleTime: 30_000,
  });

  return {
    // Memoised so the identity only changes when the data does.
    orders: useMemo(() => query.data ?? [], [query.data]),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** A single receipt. */
export function useOrderQuery(orderId: string) {
  const userId = useOrdersKey();
  const token = getUserToken();

  const query = useQuery({
    queryKey: queryKeys.orders.detail(userId, orderId),
    queryFn: async ({ signal }): Promise<NormalizedOrder | null> => {
      const raw = await apiRequest(`/engineering/orders/${orderId}`, {
        auth: "user",
        signal,
      });

      if (raw && typeof raw === "object" && "order" in raw) {
        return normalizeOrder((raw as { order: unknown }).order);
      }

      return normalizeOrder(raw);
    },
    enabled: Boolean(token) && userId !== ANONYMOUS && Boolean(orderId),
    staleTime: 30_000,
  });

  return {
    order: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Invalidates every order surface. Called after a payment succeeds or
 * when the backend pushes an `orders:updated` event.
 */
export function useInvalidateOrders() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
}
