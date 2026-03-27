import { SupportConversation } from "../models/support/supportConversation.model.js";

const SUPPORT_VENDORS_ROOM = "support:vendors";
const SUPPORT_USERS_ROOM = "support:users";

// We track multiple sockets per entity so refreshes or multiple tabs do not
// incorrectly mark a user/vendor offline while another tab is still connected.
const activeUsers = new Map();
const activeVendors = new Map();

const roomNames = {
  user: (userId) => `user:${userId}`,
  vendor: (vendorId) => `vendor:${vendorId}`,
  chat: (chatId) => `support:chat:${chatId}`,
};

const addActiveSocket = (map, entityId, socketId) => {
  const key = String(entityId);
  const sockets = map.get(key) || new Set();
  sockets.add(socketId);
  map.set(key, sockets);
  return sockets.size;
};

const removeActiveSocket = (map, entityId, socketId) => {
  const key = String(entityId);
  const sockets = map.get(key);

  if (!sockets) return 0;

  sockets.delete(socketId);

  if (!sockets.size) {
    map.delete(key);
    return 0;
  }

  map.set(key, sockets);
  return sockets.size;
};

const isUserOnline = (userId) => activeUsers.has(String(userId));
const areVendorsOnline = () => activeVendors.size > 0;

const getOnlineUserIds = () => Array.from(activeUsers.keys());
const getOnlineVendorIds = () => Array.from(activeVendors.keys());

const leaveSupportChatRoom = (socket) => {
  if (socket.data.supportChatId) {
    socket.leave(roomNames.chat(socket.data.supportChatId));
    socket.data.supportChatId = null;
  }
};

const canJoinSupportChat = async (socket, chatId) => {
  if (!chatId) return false;

  const conversation = await SupportConversation.findById(chatId)
    .select("user")
    .lean();

  if (!conversation) return false;

  if (socket.data.role === "vendor" && socket.data.vendorId) {
    // Vendors can inspect support threads broadly; user access is restricted
    // to only their own conversation below.
    return true;
  }

  if (socket.data.role === "user" && socket.data.userId) {
    return String(conversation.user) === String(socket.data.userId);
  }

  return false;
};

const joinSupportChatRoom = async (socket, chatId) => {
  if (!chatId) {
    leaveSupportChatRoom(socket);
    return { ok: true, chatId: null };
  }

  const allowed = await canJoinSupportChat(socket, chatId);

  if (!allowed) {
    return { ok: false };
  }

  const nextChatId = String(chatId);
  if (socket.data.supportChatId === nextChatId) {
    return { ok: true, chatId: nextChatId };
  }

  leaveSupportChatRoom(socket);
  socket.join(roomNames.chat(nextChatId));
  socket.data.supportChatId = nextChatId;

  return { ok: true, chatId: nextChatId };
};

const emitVendorPresenceToUsers = (io) => {
  const event = areVendorsOnline() ? "vendor_online" : "vendor_offline";
  io.to(SUPPORT_USERS_ROOM).emit(event, {
    online: areVendorsOnline(),
    vendorIds: getOnlineVendorIds(),
    at: Date.now(),
  });
};

const emitUserPresenceToVendors = (io, userId, online) => {
  io.to(SUPPORT_VENDORS_ROOM).emit(online ? "user_online" : "user_offline", {
    userId: String(userId),
    online,
    at: Date.now(),
  });
};

const emitStopTypingForActiveRoom = (socket) => {
  if (!socket.data.supportChatId) return;

  // Clear stale typing indicators on disconnect/leave so the UI does not keep
  // showing "typing..." after the sender disappears.
  socket.to(roomNames.chat(socket.data.supportChatId)).emit("stop_typing", {
    chatId: socket.data.supportChatId,
    senderId: socket.data.userId || socket.data.vendorId,
    senderRole: socket.data.role,
    at: Date.now(),
  });
};

export const registerSupportRealtime = (io, socket) => {
  const emitPresenceSnapshot = () => {
    // Newly connected clients need an initial presence snapshot because they
    // may have joined after the last online/offline broadcast was emitted.
    if (socket.data.role === "vendor" && socket.data.vendorId) {
      socket.emit("user_presence_snapshot", {
        users: getOnlineUserIds(),
        at: Date.now(),
      });
    }

    if (socket.data.role === "user" && socket.data.userId) {
      socket.emit("vendor_presence_snapshot", {
        online: areVendorsOnline(),
        vendorIds: getOnlineVendorIds(),
        at: Date.now(),
      });
    }
  };

  const onJoinSupportChat = async ({ chatId }, callback) => {
    const result = await joinSupportChatRoom(socket, chatId);
    callback?.(result);
  };

  const onLeaveSupportChat = ({ chatId } = {}, callback) => {
    if (!chatId || String(chatId) === String(socket.data.supportChatId)) {
      leaveSupportChatRoom(socket);
      callback?.({ ok: true });
      return;
    }

    callback?.({ ok: false });
  };

  const onTyping = ({ chatId }) => {
    // Typing is intentionally scoped to the joined chat room so it never leaks
    // to unrelated conversations.
    if (!chatId || String(chatId) !== String(socket.data.supportChatId)) return;

    socket.to(roomNames.chat(chatId)).emit("typing", {
      chatId: String(chatId),
      senderId: String(socket.data.userId || socket.data.vendorId),
      senderRole: socket.data.role,
      at: Date.now(),
    });
  };

  const onStopTyping = ({ chatId }) => {
    if (!chatId || String(chatId) !== String(socket.data.supportChatId)) return;

    socket.to(roomNames.chat(chatId)).emit("stop_typing", {
      chatId: String(chatId),
      senderId: String(socket.data.userId || socket.data.vendorId),
      senderRole: socket.data.role,
      at: Date.now(),
    });
  };

  socket.on("join_support_chat", onJoinSupportChat);
  socket.on("leave_support_chat", onLeaveSupportChat);
  socket.on("typing", onTyping);
  socket.on("stop_typing", onStopTyping);
  socket.on("sync_presence", emitPresenceSnapshot);

  if (socket.data.role === "vendor" && socket.data.vendorId) {
    const vendorId = String(socket.data.vendorId);
    const count = addActiveSocket(activeVendors, vendorId, socket.id);
    socket.join(roomNames.vendor(vendorId));
    socket.join(SUPPORT_VENDORS_ROOM);
    emitPresenceSnapshot();

    if (count === 1) {
      emitVendorPresenceToUsers(io);
    }
  }

  if (socket.data.role === "user" && socket.data.userId) {
    const userId = String(socket.data.userId);
    const count = addActiveSocket(activeUsers, userId, socket.id);
    socket.join(roomNames.user(userId));
    socket.join(SUPPORT_USERS_ROOM);
    emitPresenceSnapshot();

    if (count === 1) {
      emitUserPresenceToVendors(io, userId, true);
    }
  }

  socket.on("disconnect", () => {
    emitStopTypingForActiveRoom(socket);
    leaveSupportChatRoom(socket);

    if (socket.data.role === "vendor" && socket.data.vendorId) {
      const remaining = removeActiveSocket(
        activeVendors,
        socket.data.vendorId,
        socket.id,
      );

      if (!remaining) {
        emitVendorPresenceToUsers(io);
      }
    }

    if (socket.data.role === "user" && socket.data.userId) {
      const remaining = removeActiveSocket(
        activeUsers,
        socket.data.userId,
        socket.id,
      );

      if (!remaining) {
        emitUserPresenceToVendors(io, socket.data.userId, false);
      }
    }
  });
};

export const supportRooms = roomNames;
export const supportVendorRoom = SUPPORT_VENDORS_ROOM;
export const getSupportPresenceSnapshot = () => ({
  onlineUsers: getOnlineUserIds(),
  onlineVendors: getOnlineVendorIds(),
});
export const isSupportUserOnline = isUserOnline;
export const areSupportVendorsOnline = areVendorsOnline;
