import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { DeliveryPartner } from "../models/delivery/deliveryPartner.model.js";
import {
  areSupportVendorsOnline,
  isSupportUserOnline,
  registerSupportRealtime,
  supportRooms,
  supportVendorRoom,
} from "./supportRealtime.js";

let io;

const setDeliveryPartnerPresence = async (deliveryPartnerId, isOnline) => {
  if (!deliveryPartnerId) return;

  try {
    await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
      isOnline: Boolean(isOnline),
      lastActiveAt: new Date(),
      lastSeenAt: new Date(),
    });

    if (io) {
      io.emit("delivery:partners:update", {
        deliveryPartnerId: String(deliveryPartnerId),
        isOnline: Boolean(isOnline),
        at: Date.now(),
      });
    }
  } catch (error) {
    console.error("Failed to sync delivery presence:", error);
  }
};


const registerDeliveryRealtime = (socket) => {
  if (socket.data.role !== "delivery" || !socket.data.deliveryPartnerId || !io) {
    return;
  }

  const deliveryPartnerId = String(socket.data.deliveryPartnerId);
  void setDeliveryPartnerPresence(deliveryPartnerId, true);


  socket.on("disconnect", () => {
    void setDeliveryPartnerPresence(deliveryPartnerId, false);
  });
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.USER_URL,
        process.env.VENDOR_URL,
        process.env.DELIVERY_URL,
        process.env.ADMIN_URL,
        ...(process.env.NODE_ENV === "production"
          ? []
          : [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://localhost:3002",
              "http://localhost:3003",
              "http://localhost:3004",
              "http://localhost:3005",
              "http://127.0.0.1:3000",
              "http://127.0.0.1:3001",
              "http://127.0.0.1:3002",
              "http://127.0.0.1:3003",
              "http://127.0.0.1:3004",
              "http://127.0.0.1:3005",
              "http://localhost:5173",
              "http://localhost:5174",
              "http://localhost:5175",
              "http://127.0.0.1:5173",
              "http://127.0.0.1:5174",
              "http://127.0.0.1:5175",
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

        if (decoded?.role === "admin" && decoded?.adminId) {
          socket.data.adminId = decoded.adminId;
          socket.data.role = "admin";
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
      const adminToken = cookies.adminAccessToken;

      if (!vendorToken && !userToken && !deliveryToken && !adminToken) {
        return next(new Error("Unauthorized"));
      }

      if (adminToken) {
        const adminDecoded = jwt.verify(adminToken, process.env.SECRET_KEY);
        socket.data.adminId = adminDecoded.adminId;
        socket.data.role = "admin";
        return next();
      }

      if (vendorToken) {
        // Prefer explicit admin auth first because admin and vendor panels can
        // be open in the same browser and share fallback cookies.
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
      (socket.data.role === "admin" && socket.data.adminId) ||
      (socket.data.role === "delivery" && socket.data.deliveryPartnerId)
    ) {
      if (socket.data.role === "vendor" && socket.data.vendorId) {
        socket.join(`vendor:${socket.data.vendorId}`);
      }

      if (socket.data.role === "user" && socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
      }

      if (socket.data.role === "admin" && socket.data.adminId) {
        socket.join(`admin:${socket.data.adminId}`);
        socket.join("admins:all");
        socket.join("vendors:all");
      }

      if (socket.data.role === "delivery" && socket.data.deliveryPartnerId) {
        socket.join(`delivery:${socket.data.deliveryPartnerId}`);
      }

      registerDeliveryRealtime(socket);

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

  io.to("admins:all").emit("support:message", {
    conversationId: String(conversationId),
    message,
    at: Date.now(),
  });

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

  io.to("admins:all").emit("support:conversation:update", {
    conversationId: String(conversationId),
    at: Date.now(),
  });

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

export const emitVendorSupportMessageCreated = ({
  conversationId,
  vendorId,
  message,
}) => {
  if (!io || !conversationId) return;

  io.to("admins:all").emit("vendor-support:message", {
    conversationId: String(conversationId),
    message,
    at: Date.now(),
  });

  if (vendorId) {
    io.to(`vendor:${vendorId}`).emit("vendor-support:message", {
      conversationId: String(conversationId),
      message,
      at: Date.now(),
    });
  }
};

export const emitVendorSupportConversationRefresh = ({
  conversationId,
  vendorId,
}) => {
  if (!io || !conversationId) return;

  io.to("admins:all").emit("vendor-support:conversation:update", {
    conversationId: String(conversationId),
    at: Date.now(),
  });

  if (vendorId) {
    io.to(`vendor:${vendorId}`).emit("vendor-support:conversation:update", {
      conversationId: String(conversationId),
      at: Date.now(),
    });
  }
};

export const areVendorsOnline = () => areSupportVendorsOnline();
