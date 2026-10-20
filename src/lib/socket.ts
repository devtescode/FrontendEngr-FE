import { io, type Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "./config";

type TokenPayload = {
  id?: string;
  _id?: string;
  userId?: string;
};

const SOCKET_URL = API_BASE_URL;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export const getUserIdFromToken = (): string | null => {
  const token = sessionStorage.getItem("pulselab_token");
  if (!token) return null;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded.id || decoded._id || decoded.userId || null;
  } catch (error) {
    console.error("❌ Failed to decode socket token:", error);
    return null;
  }
};

// =====================================================
// MODULE-LEVEL GUARD
// =====================================================
// The "connect" listener is registered ONCE for the
// lifetime of the app. Every call to connectUserSocket
// reuses the same listener instead of stacking a new
// one. This is what prevents the flood of duplicate
// "joined socket room" logs on the backend.
//
let connectListenerRegistered = false;

function joinRoom() {
  const userId = getUserIdFromToken();
  if (!userId) return;

  socket.emit("user:join", { userId });
}

/**
 * Ensures the current user is joined to their socket
 * room.
 *
 * Safe to call from multiple components — only the
 * first call registers the underlying "connect"
 * listener. Subsequent calls reuse it.
 *
 * Also emits `user:join` immediately if the socket is
 * already connected, so a component mounting after the
 * initial connection doesn't have to wait for the next
 * reconnect event.
 */
export const connectUserSocket = (): (() => void) => {
  // Register the "connect" listener only once per
  // app lifetime.
  if (!connectListenerRegistered) {
    socket.on("connect", joinRoom);
    connectListenerRegistered = true;
  }

  // If already connected, join the room now.
  if (socket.connected) {
    joinRoom();
  }

  // Return a no-op cleanup. We deliberately keep the
  // listener registered for the app's life, since
  // removing it here would break other components that
  // rely on the same connection.
  return () => {};
};

// =====================================================
// RESET (call on logout)
// =====================================================
// Removes the "connect" listener and disconnects. On
// the next login, connectUserSocket will re-register.
//
export function disconnectUserSocket() {
  socket.off("connect", joinRoom);
  connectListenerRegistered = false;
  socket.disconnect();
}