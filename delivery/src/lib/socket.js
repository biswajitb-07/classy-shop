import { io } from "socket.io-client";
import { resolveApiBaseUrl } from "./apiBase";

let deliverySocket = null;

export const getDeliverySocket = () => {
  if (!deliverySocket) {
    deliverySocket = io(resolveApiBaseUrl(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }

  return deliverySocket;
};

export const disconnectDeliverySocket = () => {
  if (!deliverySocket) return;
  deliverySocket.disconnect();
  deliverySocket = null;
};
