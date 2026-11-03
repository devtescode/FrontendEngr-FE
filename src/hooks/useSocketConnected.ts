import { useEffect, useState } from "react";

import { socket } from "@/lib/socket";

/**
 * Tracks the shared Socket.IO connection so public UI never claims a live
 * connection when the transport is actually reconnecting.
 */
export function useSocketConnected(): boolean {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    setConnected(socket.connected);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return connected;
}
