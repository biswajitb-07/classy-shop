// File guide: socket source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import {
  areSupportVendorsOnline,
  isSupportUserOnline,
  registerSupportRealtime,
  supportRooms,
  supportVendorRoom,
} from "./supportRealtime.js";

let io;

// Socket auth can come from a short-lived socket token or fallback cookies.
// This helper normalizes the cookie path for the fallback branch.
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
      const socketToken = socket.handshake.auth?.socketToken;

      if (socketToken) {
        // Preferred path for production: the frontend fetches a socket-specific
        // token over authenticated HTTP, then uses it during the handshake.
        const decoded = jwt.verify(socketToken, process.env.SECRET_KEY);

        if (decoded?.scope !== "socket") {
          return next(new Error("Unauthorized"));
        }

        if (decoded?.role === "vendor" && decoded?.vendorId) {
          socket.data.vendorId = decoded.vendorId;
          socket.data.role = "vendor";
          return next();
        }

        if (decoded?.role === "user" && decoded?.userId) {
          socket.data.userId = decoded.userId;
          socket.data.role = "user";
          return next();
        }
      }

      // Fallback for environments where normal auth cookies are still present
      // during the websocket/polling handshake.
      const cookies = parseCookies(socket.handshake.headers.cookie || "");
      const vendorToken = cookies.vendorAccessToken || cookies.token1;
      const userToken = cookies.accessToken;

      if (!vendorToken && !userToken) {
        return next(new Error("Unauthorized"));
      }

      if (vendorToken) {
        const decoded = jwt.verify(vendorToken, process.env.SECRET_KEY);
        socket.data.vendorId = decoded.vendorId;
        socket.data.role = "vendor";
        return next();
      }

      const decoded = jwt.verify(userToken, process.env.SECRET_KEY);
      socket.data.userId = decoded.userId;
      socket.data.role = "user";
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    if (
      (socket.data.role === "vendor" && socket.data.vendorId) ||
      (socket.data.role === "user" && socket.data.userId)
    ) {
      if (socket.data.role === "vendor" && socket.data.vendorId) {
        socket.join(`vendor:${socket.data.vendorId}`);
      }

      // The dedicated support realtime module owns presence, chat-room joins,
      // and typing events so this bootstrap file stays focused on auth/setup.
      registerSupportRealtime(io, socket);
      return;
    }

    socket.disconnect(true);
  });

  return io;
};

export const isUserOnline = (userId) => isSupportUserOnline(userId);

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

export const emitSupportMessageCreated = ({
  conversationId,
  userId,
  message,
}) => {
  if (!io) return;

  io.to(supportVendorRoom).emit("support:message", {
    conversationId: String(conversationId),
    message,
    at: Date.now(),
  });

  if (userId) {
    io.to(supportRooms.user(userId)).emit("support:message", {
      conversationId: String(conversationId),
      message,
      at: Date.now(),
    });
  }
};

export const emitSupportConversationRefresh = ({
  conversationId,
  userId,
}) => {
  if (!io) return;

  io.to(supportVendorRoom).emit("support:conversation:update", {
    conversationId: String(conversationId),
    at: Date.now(),
  });

  if (userId) {
    io.to(supportRooms.user(userId)).emit("support:conversation:update", {
      conversationId: String(conversationId),
      at: Date.now(),
    });
  }
};

export const areVendorsOnline = () => areSupportVendorsOnline();
