import { useEffect } from "react";
import { socket, connectUserSocket } from "@/lib/socket";
import { useStore } from "@/lib/store";

/**
 * Attaches socket listeners that push live order + inventory events
 * into the Zustand store. Call once from AdminShell.
 *
 * ⚠️ Event names below are placeholders — rename them to match
 * whatever your server actually emits (grep the server for
 * `io.emit(` / `socket.to(...).emit(` / `socket.broadcast.emit(`).
 */
export function useAdminRealtime() {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    connectUserSocket(); // must join the admin room server-side

    const onOrderNew = (order: any) => {
      useStore.setState((s: any) => ({
        orders: [order, ...s.orders],
      }));
    };

    const onOrderUpdated = (order: any) => {
      useStore.setState((s: any) => ({
        orders: s.orders.map((o: any) =>
          o.id === order.id ? { ...o, ...order } : o
        ),
      }));
    };

    const onOrderDeleted = (id: string) => {
      useStore.setState((s: any) => ({
        orders: s.orders.filter((o: any) => o.id !== id),
      }));
    };

    const onComponentCreated = (comp: any) => {
      useStore.setState((s: any) => ({
        components: [comp, ...s.components],
      }));
    };

    const onComponentUpdated = (comp: any) => {
      useStore.setState((s: any) => ({
        components: s.components.map((c: any) =>
          c.id === comp.id ? { ...c, ...comp } : c
        ),
      }));
    };

    const onComponentDeleted = (id: string) => {
      useStore.setState((s: any) => ({
        components: s.components.filter((c: any) => c.id !== id),
      }));
    };

    socket.on("order:new", onOrderNew);
    socket.on("order:updated", onOrderUpdated);
    socket.on("order:deleted", onOrderDeleted);
    socket.on("component:created", onComponentCreated);
    socket.on("component:updated", onComponentUpdated);
    socket.on("component:deleted", onComponentDeleted);

    return () => {
      socket.off("order:new", onOrderNew);
      socket.off("order:updated", onOrderUpdated);
      socket.off("order:deleted", onOrderDeleted);
      socket.off("component:created", onComponentCreated);
      socket.off("component:updated", onComponentUpdated);
      socket.off("component:deleted", onComponentDeleted);
    };
  }, []);
}