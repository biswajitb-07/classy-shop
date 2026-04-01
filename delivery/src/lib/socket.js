import { io } from "socket.io-client";
import { resolveApiBaseUrl } from "./apiBase";

let deliverySocket = null;
const SOCKET_URL = resolveApiBaseUrl();
const SOCKET_AUTH_URL = `${SOCKET_URL}/api/v1/delivery/socket-auth`;

const getDeliverySocketAuth = async () => {
  const response = await fetch(SOCKET_AUTH_URL, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch delivery socket auth");
  }

  const data = await response.json();
  return data?.socketToken || "";
};

export const getDeliverySocket = () => {
  if (!deliverySocket) {
    deliverySocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: async (callback) => {
        try {
          const socketToken = await getDeliverySocketAuth();
          callback({ socketToken });
        } catch (_error) {
          callback({});
        }
      },
    });
  }

  return deliverySocket;
};

export const disconnectDeliverySocket = () => {
  if (!deliverySocket) return;
  deliverySocket.disconnect();
  deliverySocket = null;
};
