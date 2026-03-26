import jwt from "jsonwebtoken";
import { Server } from "socket.io";

let io;

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join("=") || "");
    return acc;
  }, {});

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.USER_URL, process.env.VENDOR_URL].filter(Boolean),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || "");
      const token = cookies.token1;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      socket.data.vendorId = decoded.vendorId;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const vendorId = socket.data.vendorId;
    if (!vendorId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`vendor:${vendorId}`);
    socket.join("vendors:all");
  });

  return io;
};

export const getIO = () => io;

export const emitVendorNotificationUpdate = (vendorId) => {
  if (!io || !vendorId) return;
  io.to(`vendor:${vendorId}`).emit("vendor:notifications:update", {
    vendorId: String(vendorId),
    at: Date.now(),
  });
};

export const emitVendorDashboardUpdate = (vendorId) => {
  if (!io || !vendorId) return;
  io.to(`vendor:${vendorId}`).emit("vendor:dashboard:update", {
    vendorId: String(vendorId),
    at: Date.now(),
  });
};

export const emitVendorSummaryUpdate = () => {
  if (!io) return;
  io.to("vendors:all").emit("vendor:summary:update", {
    at: Date.now(),
  });
};
