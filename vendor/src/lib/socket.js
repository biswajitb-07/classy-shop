// File guide: socket source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
const SOCKET_AUTH_URL = `${SOCKET_URL}/api/v1/vendor/socket-auth`;

let socket;

const getVendorSocketAuth = async () => {
  const response = await fetch(SOCKET_AUTH_URL, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch vendor socket auth");
  }

  const data = await response.json();
  return data?.socketToken || "";
};

export const getVendorSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["polling", "websocket"],
      autoConnect: false,
      auth: async (callback) => {
        try {
          const socketToken = await getVendorSocketAuth();
          callback({ socketToken });
        } catch (_error) {
          callback({});
        }
      },
    });
  }

  return socket;
};

export const connectVendorSocket = () => {
  const currentSocket = getVendorSocket();
  if (!currentSocket.connected) {
    currentSocket.connect();
  }
  return currentSocket;
};

export const disconnectVendorSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
