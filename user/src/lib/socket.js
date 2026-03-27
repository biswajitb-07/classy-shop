// File guide: socket source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
const SOCKET_AUTH_URL = `${SOCKET_URL}/api/v1/user/socket-auth`;

let socket;

const getUserSocketAuth = async () => {
  const response = await fetch(SOCKET_AUTH_URL, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user socket auth");
  }

  const data = await response.json();
  return data?.socketToken || "";
};

export const getUserSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["polling", "websocket"],
      autoConnect: false,
      auth: async (callback) => {
        try {
          const socketToken = await getUserSocketAuth();
          callback({ socketToken });
        } catch (_error) {
          callback({});
        }
      },
    });
  }

  return socket;
};

export const connectUserSocket = () => {
  const currentSocket = getUserSocket();
  if (!currentSocket.connected) {
    currentSocket.connect();
  }
  return currentSocket;
};

export const disconnectUserSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
