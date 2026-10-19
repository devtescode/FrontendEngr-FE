import { useEffect } from "react";
import { socket, connectUserSocket } from "@/lib/socket";
import { normalizeOrder, useStore } from "@/lib/store";

/**
 * Live order + inventory events from the server, pushed straight into Zustand.
 * Call once from AdminShell.
 *
 * ⚠️ Rename the `socket.on(...)` event names to match whatever your server
 * emits (grep the server for `io.to("admin").emit(`).
 */
export function useAdminRealtime() {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    connectUserSocket(); // joins the "admin" room server-side

    const idOf = (x: any) => String(x?.id ?? x?._id ?? "");

    /* ==================== ORDERS ==================== */

    const onOrderNew = (raw: any) => {
      const order = normalizeOrder(raw);
      useStore.setState((s) => {
        // avoid duplicates if the same event fires twice
        if (s.orders.some((o) => o.id === order.id)) return s;
        return { orders: [order, ...s.orders] };
      });
    };

    const onOrderUpdated = (raw: any) => {
      const order = normalizeOrder(raw);
      useStore.setState((s) => ({
        orders: s.orders.map((o) =>
          o.id === order.id ? { ...o, ...order } : o
        ),
      }));
    };

    const onOrderDeleted = (payload: any) => {
      const key =
        typeof payload === "string" ? payload : idOf(payload);
      useStore.setState((s) => ({
        orders: s.orders.filter((o) => o.id !== key),
      }));
    };

    /* ================== COMPONENTS ================== */

    const onComponentCreated = (comp: any) => {
      const normalized = {
        ...comp,
        id: idOf(comp),
        stock: Number(comp?.stock ?? 0),
      };
      useStore.setState((s) => {
        if (s.components.some((c) => c.id === normalized.id)) return s;
        return { components: [normalized, ...s.components] };
      });
    };

    const onComponentUpdated = (comp: any) => {
      const normalized = {
        ...comp,
        id: idOf(comp),
        stock: Number(comp?.stock ?? 0),
      };
      useStore.setState((s) => ({
        components: s.components.map((c) =>
          c.id === normalized.id ? { ...c, ...normalized } : c
        ),
      }));
    };

    const onComponentDeleted = (payload: any) => {
      const key =
        typeof payload === "string" ? payload : idOf(payload);
      useStore.setState((s) => ({
        components: s.components.filter((c) => c.id !== key),
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