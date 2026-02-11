import { io } from "socket.io-client";

let socket = null;

/**
 * Connect socket with authenticated user
 * @param {Object} params
 * @param {string} params.userId - Firebase/User login ID
 * @param {string} params.role - admin | teacher | student
 */
export const connectSocket = ({ userId, role }) => {
  if (!userId || !role) {
    console.log("❌ Socket connection failed: Missing userId or role");
    return null;
  }

  // 🔁 If socket already exists, disconnect first
  if (socket) {
    console.log("⚠️ Existing socket found, disconnecting:", socket.id);
    socket.disconnect();
    socket = null;
  }

  // 🔌 Create new socket connection
  socket = io("https:10.69.46.173:3000", {
    transports: ["websocket"],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // ✅ On successful connection
  socket.on("connect", () => {
    console.log("✅ SOCKET CONNECTED:", socket.id);

    socket.emit("register", {
      userId,
      role,
    });
  });

  // 🔴 On disconnect
  socket.on("disconnect", (reason) => {
    console.log("🔴 SOCKET DISCONNECTED:", reason);
  });

  // ❌ Connection error
  socket.on("connect_error", (err) => {
    console.log("❌ SOCKET CONNECTION ERROR:", err.message);
  });

  return socket;
};

/**
 * Disconnect socket safely (used on logout)
 */
export const disconnectSocket = () => {
  if (!socket) {
    console.log("⚠️ No active socket to disconnect");
    return;
  }

  console.log("🔌 Logging out socket:", socket.id);

  // Notify backend explicitly
  socket.emit("logout");

  socket.disconnect();
  socket = null;
};
