import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socket, connectUserSocket } from "@/lib/socket";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Bridges the server's realtime events into React Query.
 *
 * The backend broadcasts:
 *   • `component:created` / `component:updated` / `component:deleted`
 *     — the catalog changed
 *   • `components:refreshed` — stock levels changed after a payment
 *   • `orders:updated`      — a pickup status changed (room scoped)
 *   • `cart:updated`        — the cart changed (room scoped)
 *
 * Instead of writing the payload into a second copy of the data, we
 * invalidate the affected queries and let them re-read from the server.
 *
 * Call once from AdminShell.
 */
export function useAdminRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    connectUserSocket(); // joins the user room server-side

    const invalidateComponents = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.components.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    };

    const invalidateOrders = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.all,
      });
    };

    const invalidateCart = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cart.all,
      });
    };

    socket.on("component:created", invalidateComponents);
    socket.on("component:updated", invalidateComponents);
    socket.on("component:deleted", invalidateComponents);
    socket.on("components:refreshed", invalidateComponents);
    socket.on("orders:updated", invalidateOrders);
    socket.on("cart:updated", invalidateCart);

    return () => {
      socket.off("component:created", invalidateComponents);
      socket.off("component:updated", invalidateComponents);
      socket.off("component:deleted", invalidateComponents);
      socket.off("components:refreshed", invalidateComponents);
      socket.off("orders:updated", invalidateOrders);
      socket.off("cart:updated", invalidateCart);
    };
  }, [queryClient]);
}
