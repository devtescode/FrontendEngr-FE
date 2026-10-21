import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/apiClient";
import { getCurrentUserId, getUserToken } from "@/lib/auth";
import {
  extractCart,
  normalizeCart,
  type NormalizedCart,
} from "@/lib/normalize";
import { queryKeys } from "@/lib/queryKeys";
import type { BackendComponent } from "@/lib/api";

const ANONYMOUS = "anonymous";

function useCartKey(): string {
  // The key is scoped to the signed-in student so two accounts on the
  // same browser never share a cart.
  return getCurrentUserId() ?? ANONYMOUS;
}

/* ============================================================
   QUERY
   ============================================================ */

export function useCartQuery() {
  const userId = useCartKey();
  const token = getUserToken();

  const query = useQuery({
    queryKey: queryKeys.cart.detail(userId),
    queryFn: async ({ signal }): Promise<NormalizedCart> => {
      const raw = await apiRequest("/engineering/cart", {
        auth: "user",
        signal,
      });

      return normalizeCart(raw);
    },
    enabled: Boolean(token) && userId !== ANONYMOUS,
    staleTime: 10_000,
  });

  return {
    // Memoised so the identity only changes when the data does.
    cart: useMemo(() => query.data ?? normalizeCart(null), [query.data]),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/* ============================================================
   MUTATIONS
   ============================================================ */

export type CartMutationVariables = {
  componentId: string;
  quantity?: number;
  component?: BackendComponent;
};

function optimisticAdd(
  cart: NormalizedCart,
  componentId: string,
  quantity: number,
  component?: BackendComponent
): NormalizedCart {
  const existing = cart.items.find((i) => i.componentId === componentId);
  const items = existing
    ? cart.items.map((i) =>
        i.componentId === componentId
          ? { ...i, quantity: i.quantity + quantity }
          : i
      )
    : [
        ...cart.items,
        {
          componentId,
          quantity,
          component: component ? { ...component } : null,
        },
      ];

  return {
    ...cart,
    items,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

function optimisticSetQuantity(
  cart: NormalizedCart,
  componentId: string,
  quantity: number
): NormalizedCart {
  const items = cart.items
    .map((i) => (i.componentId === componentId ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);

  return {
    ...cart,
    items,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const userId = useCartKey();
  const cartKey = queryKeys.cart.detail(userId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });

  const addToCart = useMutation({
    mutationFn: async ({
      componentId,
      quantity = 1,
    }: CartMutationVariables) => {
      const response = await apiRequest("/engineering/addtocart", {
        method: "POST",
        auth: "user",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentId, quantity }),
      });

      return extractCart(response);
    },
    onMutate: async ({ componentId, quantity = 1, component }) => {
      await queryClient.cancelQueries({ queryKey: cartKey });

      const previous = queryClient.getQueryData<NormalizedCart>(cartKey);

      if (previous) {
        queryClient.setQueryData<NormalizedCart>(
          cartKey,
          optimisticAdd(previous, componentId, quantity, component)
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartKey, context.previous);
      }
    },
    onSettled: invalidate,
  });

  const updateQuantity = useMutation({
    mutationFn: async ({
      componentId,
      quantity,
    }: CartMutationVariables) => {
      const response = await apiRequest(
        `/engineering/cart/${componentId}`,
        {
          method: "PUT",
          auth: "user",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        }
      );

      return extractCart(response);
    },
    onMutate: async ({ componentId, quantity = 0 }) => {
      await queryClient.cancelQueries({ queryKey: cartKey });

      const previous = queryClient.getQueryData<NormalizedCart>(cartKey);

      if (previous) {
        queryClient.setQueryData<NormalizedCart>(
          cartKey,
          optimisticSetQuantity(previous, componentId, quantity)
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartKey, context.previous);
      }
    },
    onSettled: invalidate,
  });

  const removeFromCart = useMutation({
    mutationFn: async ({ componentId }: CartMutationVariables) => {
      const response = await apiRequest(`/engineering/cart/${componentId}`, {
        method: "DELETE",
        auth: "user",
      });

      return extractCart(response);
    },
    onMutate: async ({ componentId }) => {
      await queryClient.cancelQueries({ queryKey: cartKey });

      const previous = queryClient.getQueryData<NormalizedCart>(cartKey);

      if (previous) {
        queryClient.setQueryData<NormalizedCart>(
          cartKey,
          optimisticSetQuantity(previous, componentId, 0)
        );
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartKey, context.previous);
      }
    },
    onSettled: invalidate,
  });

  return {
    addToCart,
    updateQuantity,
    removeFromCart,
    isPending:
      addToCart.isPending ||
      updateQuantity.isPending ||
      removeFromCart.isPending,
  };
}
