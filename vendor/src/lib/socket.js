import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

let socket;

export const getVendorSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: false,
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
