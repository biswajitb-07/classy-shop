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
      origin: [
        process.env.USER_URL,
        process.env.VENDOR_URL,
        process.env.DELIVERY_URL,
        ...(process.env.NODE_ENV === "production"
          ? []
          : [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://localhost:3002",
            ]),
      ].filter(Boolean),
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

        if (decoded?.role === "delivery" && decoded?.deliveryPartnerId) {
          socket.data.deliveryPartnerId = decoded.deliveryPartnerId;
          socket.data.role = "delivery";
          return next();
        }
      }

      // Fallback for environments where normal auth cookies are still present
      // during the websocket/polling handshake.
      const cookies = parseCookies(socket.handshake.headers.cookie || "");
      const vendorToken = cookies.vendorAccessToken || cookies.token1;
      const userToken = cookies.accessToken;
      const deliveryToken = cookies.deliveryAccessToken;

      if (!vendorToken && !userToken && !deliveryToken) {
        return next(new Error("Unauthorized"));
      }

      if (vendorToken) {
        // Vendor dashboard and user storefront use different cookie names, so
        // the socket layer mirrors the same distinction during fallback auth.
        const decoded = jwt.verify(vendorToken, process.env.SECRET_KEY);
        socket.data.vendorId = decoded.vendorId;
        socket.data.role = "vendor";
        return next();
      }

      if (userToken) {
        const decoded = jwt.verify(userToken, process.env.SECRET_KEY);
        if (decoded?.userId) {
          socket.data.userId = decoded.userId;
          socket.data.role = "user";
          return next();
        }
      }

      if (deliveryToken) {
        const deliveryDecoded = jwt.verify(deliveryToken, process.env.SECRET_KEY);
        socket.data.deliveryPartnerId = deliveryDecoded.deliveryPartnerId;
        socket.data.role = "delivery";
        return next();
      }

      return next(new Error("Unauthorized"));
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    if (
      (socket.data.role === "vendor" && socket.data.vendorId) ||
      (socket.data.role === "user" && socket.data.userId) ||
      (socket.data.role === "delivery" && socket.data.deliveryPartnerId)
    ) {
      if (socket.data.role === "vendor" && socket.data.vendorId) {
        socket.join(`vendor:${socket.data.vendorId}`);
      }

      if (socket.data.role === "user" && socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
      }

      if (socket.data.role === "delivery" && socket.data.deliveryPartnerId) {
        socket.join(`delivery:${socket.data.deliveryPartnerId}`);
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

export const emitUserNotificationUpdate = (userId) => {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("user:notifications:update", {
    userId: String(userId),
    at: Date.now(),
  });
};

export const emitDeliveryAssignment = ({ deliveryPartnerId, orderId, message }) => {
  if (!io || !deliveryPartnerId) return;
  io.to(`delivery:${deliveryPartnerId}`).emit("delivery:assignment", {
    deliveryPartnerId: String(deliveryPartnerId),
    orderId: orderId ? String(orderId) : null,
    message: message || "A new order has been assigned to you.",
    at: Date.now(),
  });
};

export const emitDeliveryDashboardUpdate = (deliveryPartnerId) => {
  if (!io || !deliveryPartnerId) return;
  io.to(`delivery:${deliveryPartnerId}`).emit("delivery:dashboard:update", {
    deliveryPartnerId: String(deliveryPartnerId),
    at: Date.now(),
  });
};

export const emitDeliveryNotificationUpdate = (deliveryPartnerId) => {
  if (!io || !deliveryPartnerId) return;
  io.to(`delivery:${deliveryPartnerId}`).emit("delivery:notifications:update", {
    deliveryPartnerId: String(deliveryPartnerId),
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

  // Vendors watch the shared support room, while the user receives updates in
  // their own private room so unrelated users never see the event.
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
