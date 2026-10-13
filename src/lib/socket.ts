import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  id?: string;
  _id?: string;
  userId?: string;
};

const SOCKET_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

export const socket = io(SOCKET_URL, {
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

/**
 * Joins the current user's socket room.
 *
 * Returns a cleanup function that removes the
 * "connect" listener added here. Call it in the
 * useEffect return of any component using the socket.
 */
export const connectUserSocket = (): (() => void) => {
  const userId = getUserIdFromToken();

  if (!userId) {
    console.log("❌ No userId found — socket not joined");
    return () => {};
  }

  const joinRoom = () => {
    console.log("👤 Joining socket room for user:", userId);
    socket.emit("user:join", { userId });
  };

  // Re-join on every reconnect — critical for mobile
  // networks and server restarts.
  socket.on("connect", joinRoom);

  // If already connected, join immediately.
  if (socket.connected) {
    joinRoom();
  }

  console.log("🟢 Socket user ready:", userId);

  return () => {
    socket.off("connect", joinRoom);
  };
};