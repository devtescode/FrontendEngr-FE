// import { io } from "socket.io-client";

// const SOCKET_URL = "http://localhost:4500";

// export const socket = io(SOCKET_URL, {
//   autoConnect: true,
//   transports: ["websocket"],
// });
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  id?: string;
  _id?: string;
  userId?: string;
};

export const socket = io("http://localhost:4500", {
  autoConnect: true,
  transports: ["websocket"],
});

export const connectUserSocket = () => {
  const token = sessionStorage.getItem("pulselab_token");

  if (!token) {
    console.log("❌ No token found for socket");
    return;
  }

  try {
    const decoded = jwtDecode<TokenPayload>(token);

    const userId =
      decoded.id ||
      decoded._id ||
      decoded.userId;

    if (!userId) {
      console.log("❌ No userId found in token");
      return;
    }

    const joinRoom = () => {
      console.log(
        "👤 Joining socket room:",
        `user:${userId}`
      );

      socket.emit("user:join", {
        userId,
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    console.log("🟢 Socket user:", userId);
  } catch (error) {
    console.error(
      "❌ Failed to decode socket token:",
      error
    );
  }
};