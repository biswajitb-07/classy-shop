import mongoose from "mongoose";
import { SupportConversation } from "../../models/support/supportConversation.model.js";
import { SupportMessage } from "../../models/support/supportMessage.model.js";
import { Admin } from "../../models/admin/admin.model.js";
import { User } from "../../models/user/user.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMedia,
} from "../../utils/cloudinary.js";
import {
  emitSupportConversationRefresh,
  emitSupportMessageCreated,
  isUserOnline,
} from "../../socket/socket.js";
import { classifySupportTicket } from "../../services/ai/commerceAssistant.service.js";

const mapMessage = (message) => ({
  _id: message._id,
  conversation: message.conversation,
  senderId: String(message.senderId),
  senderRole: message.senderRole,
  text: message.text,
  attachments: message.attachments || [],
  status: message.status,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const mapConversation = (conversation) => ({
  _id: conversation._id,
  user: conversation.user,
  assignedVendor: conversation.assignedVendor,
  assignedAdmin: conversation.assignedAdmin,
  lastMessage: conversation.lastMessage,
  lastMessageAt: conversation.lastMessageAt,
  lastMessageSenderRole: conversation.lastMessageSenderRole,
  unreadForUser: conversation.unreadForUser,
  unreadForVendor: conversation.unreadForVendor,
  unreadForAdmin: conversation.unreadForAdmin,
  status: conversation.status,
  userOnline: isUserOnline(conversation.user?._id || conversation.user),
  classification: classifySupportTicket({
    message: conversation.lastMessage,
    scope: "user",
  }),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

const loadConversationWithRelations = (conversationId) =>
  SupportConversation.findById(conversationId)
    .populate("user", "name email phone photoUrl")
    .populate("assignedVendor", "name email photoUrl")
    .populate("assignedAdmin", "name email photoUrl");

const uploadAttachments = async (files = []) => {
  // Support chat attachments are normalized into a small metadata shape so the
  // frontend never depends on raw Cloudinary responses.
  const uploads = await Promise.all(
    files.map(async (file) => {
      const result = await uploadMedia(file);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.originalname || "",
      };
    }),
  );

  return uploads;
};

const dropLegacyUserConversationIndex = async () => {
  try {
    const collection = mongoose.connection.db?.collection("supportconversations");

    if (!collection) return;

    const indexes = await collection.indexes();
    const legacyUserIndex = indexes.find(
      (index) => index.name === "user_1" && index.unique,
    );

    if (legacyUserIndex) {
      await collection.dropIndex("user_1");
    }
  } catch (error) {
    if (error?.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }
};

const createConversationForUser = async (userId) => {
  try {
    const conversation = await SupportConversation.create({
      user: userId,
    });

    return loadConversationWithRelations(conversation._id);
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.user) {
      // Older databases may still have the legacy one-conversation-per-user
      // unique index. Drop it once, then retry the create transparently.
      await dropLegacyUserConversationIndex();

      const conversation = await SupportConversation.create({
        user: userId,
      });

      return loadConversationWithRelations(conversation._id);
    }

    throw error;
  }
};

const markConversationReadFor = async (conversationId, readerRole) => {
  const readerIsUser = readerRole === "user";

  await SupportMessage.updateMany(
    {
      conversation: conversationId,
      senderRole: readerIsUser ? { $in: ["vendor", "admin"] } : "user",
      status: { $in: ["sent", "delivered"] },
    },
    {
      $set: {
        status: "read",
        readAt: new Date(),
      },
    },
  );

  const update = readerIsUser
    ? { unreadForUser: 0 }
    : { unreadForVendor: 0, unreadForAdmin: 0 };

  await SupportConversation.findByIdAndUpdate(conversationId, {
    $set: update,
  });
};

const markConversationDeliveredForVendor = async (conversationIds = []) => {
  if (!conversationIds.length) return;

  await SupportMessage.updateMany(
    {
      conversation: { $in: conversationIds },
      senderRole: "user",
      status: "sent",
    },
    {
      $set: { status: "delivered" },
    },
  );
};

const deleteConversationAssets = async (conversationId) => {
  const messages = await SupportMessage.find({
    conversation: conversationId,
  }).select("attachments");

  const publicIds = messages.flatMap((message) =>
    (message.attachments || [])
      .map((attachment) => attachment.publicId)
      .filter(Boolean),
  );

  await Promise.all(publicIds.map((publicId) => deleteMediaFromCloudinary(publicId)));
  await SupportMessage.deleteMany({ conversation: conversationId });
  await SupportConversation.findByIdAndDelete(conversationId);
};

const cleanupEmptySupportConversations = async (filter = {}) => {
  const conversations = await SupportConversation.find(filter).select("_id");

  if (!conversations.length) return;

  const conversationIds = conversations.map((conversation) => conversation._id);
  const activeConversationIds = await SupportMessage.distinct("conversation", {
    conversation: { $in: conversationIds },
  });
  const activeConversationIdSet = new Set(
    activeConversationIds.map((conversationId) => String(conversationId)),
  );
  const emptyConversationIds = conversationIds.filter(
    (conversationId) => !activeConversationIdSet.has(String(conversationId)),
  );

  if (!emptyConversationIds.length) return;

  // Draft chats with no messages should disappear instead of cluttering the
  // chat list after refresh or route changes.
  await SupportConversation.deleteMany({
    _id: { $in: emptyConversationIds },
  });
};

const cleanupExpiredSupportConversations = async (filter = {}) => {
  const cutoffDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const expiredConversations = await SupportConversation.find({
    ...filter,
    lastMessageAt: { $ne: null, $lte: cutoffDate },
  }).select("_id");

  if (!expiredConversations.length) return;

  await Promise.all(
    expiredConversations.map((conversation) =>
      deleteConversationAssets(conversation._id),
    ),
  );
};

const ensureConversationOwner = async (conversationId, userId) => {
  const conversation = await loadConversationWithRelations(conversationId);
  if (!conversation) return null;
  // User support APIs should never expose another user's conversation even if
  // someone guesses a valid conversation id.
  if (String(conversation.user?._id || conversation.user) !== String(userId)) {
    return "forbidden";
  }
  return conversation;
};

export const getUserSupportConversations = async (req, res) => {
  try {
    await cleanupExpiredSupportConversations({ user: req.id });

    const conversations = await SupportConversation.find({
      user: req.id,
      lastMessageAt: { $ne: null },
    })
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      conversations: conversations.map(mapConversation),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support conversations",
    });
  }
};

export const getUserSupportConversation = async (req, res) => {
  try {
    await cleanupExpiredSupportConversations({ user: req.id });

    const conversation =
      (await SupportConversation.findOne({ user: req.id })
        .sort({ updatedAt: -1 })
        .populate("user", "name email phone photoUrl")
        .populate("assignedVendor", "name email photoUrl")
        .populate("assignedAdmin", "name email photoUrl")) ||
      (await createConversationForUser(req.id));

    await markConversationReadFor(conversation._id, "user");

    const refreshedConversation = await SupportConversation.findById(
      conversation._id,
    )
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    const messages = await SupportMessage.find({
      conversation: conversation._id,
    }).sort({ createdAt: 1 });

    emitSupportConversationRefresh({
      conversationId: conversation._id,
      userId: req.id,
    });

    return res.status(200).json({
      success: true,
      conversation: mapConversation(refreshedConversation),
      messages: messages.map(mapMessage),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support conversation",
    });
  }
};

export const createUserSupportConversation = async (req, res) => {
  try {
    const conversation = await createConversationForUser(req.id);

    emitSupportConversationRefresh({
      conversationId: conversation._id,
      userId: req.id,
    });

    return res.status(201).json({
      success: true,
      conversation: mapConversation(conversation),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create support conversation",
    });
  }
};

export const getUserSupportConversationDetails = async (req, res) => {
  try {
    await cleanupExpiredSupportConversations({ user: req.id });

    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id",
      });
    }

    const conversation = await ensureConversationOwner(conversationId, req.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation === "forbidden") {
      return res.status(403).json({
        success: false,
        message: "You cannot access this conversation",
      });
    }

    await markConversationReadFor(conversationId, "user");
    const refreshedConversation = await loadConversationWithRelations(conversationId);
    const messages = await SupportMessage.find({
      conversation: conversationId,
    }).sort({ createdAt: 1 });

    emitSupportConversationRefresh({
      conversationId,
      userId: req.id,
    });

    return res.status(200).json({
      success: true,
      conversation: mapConversation(refreshedConversation),
      messages: messages.map(mapMessage),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load conversation details",
    });
  }
};

export const sendUserSupportMessage = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const requestedConversationId = req.body?.conversationId;
    const attachments = await uploadAttachments(req.files || []);

    if (!text && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a message or image attachment",
      });
    }

    let conversation;

    if (
      requestedConversationId &&
      mongoose.Types.ObjectId.isValid(requestedConversationId)
    ) {
      const ownedConversation = await ensureConversationOwner(
        requestedConversationId,
        req.id,
      );

      if (ownedConversation === "forbidden") {
        return res.status(403).json({
          success: false,
          message: "You cannot use this conversation",
        });
      }

      conversation = ownedConversation;
    } else {
      conversation = await createConversationForUser(req.id);
    }

    const message = await SupportMessage.create({
      conversation: conversation._id,
      senderId: req.id,
      senderRole: "user",
      text,
      attachments,
      status: "sent",
    });

    await SupportConversation.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: text || "Image attachment",
        lastMessageAt: message.createdAt,
        lastMessageSenderRole: "user",
      },
      $inc: {
        unreadForVendor: 1,
        unreadForAdmin: 1,
      },
    });

    const updatedConversation = await SupportConversation.findById(
      conversation._id,
    )
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    const payload = mapMessage(message.toObject ? message.toObject() : message);

    emitSupportMessageCreated({
      conversationId: conversation._id,
      userId: req.id,
      message: payload,
    });
    emitSupportConversationRefresh({
      conversationId: conversation._id,
      userId: req.id,
    });

    return res.status(201).json({
      success: true,
      conversation: mapConversation(updatedConversation),
      message: payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send support message",
    });
  }
};

export const deleteUserSupportConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await ensureConversationOwner(conversationId, req.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation === "forbidden") {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this conversation",
      });
    }

    await deleteConversationAssets(conversationId);
    emitSupportConversationRefresh({
      conversationId,
      userId: req.id,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete conversation",
    });
  }
};

export const cleanupUserEmptySupportConversations = async (req, res) => {
  try {
    await cleanupEmptySupportConversations({ user: req.id });

    return res.status(200).json({
      success: true,
      message: "Empty support conversations cleaned successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to clean empty support conversations",
    });
  }
};

export const getVendorSupportConversations = async (req, res) => {
  try {
    await cleanupExpiredSupportConversations();

    const conversations = await SupportConversation.find({
      lastMessageAt: { $ne: null },
    })
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    await markConversationDeliveredForVendor(
      conversations.map((conversation) => conversation._id),
    );

    return res.status(200).json({
      success: true,
      conversations: conversations.map(mapConversation),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support chats",
    });
  }
};

export const getVendorSupportConversationDetails = async (req, res) => {
  try {
    await cleanupExpiredSupportConversations();

    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id",
      });
    }

    const conversation = await SupportConversation.findById(conversationId)
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    await markConversationReadFor(conversationId, "admin");

    if (!conversation.assignedAdmin) {
      await SupportConversation.findByIdAndUpdate(conversationId, {
        $set: { assignedAdmin: req.id },
      });
    }

    const refreshedConversation = await SupportConversation.findById(
      conversationId,
    )
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    const messages = await SupportMessage.find({
      conversation: conversationId,
    }).sort({ createdAt: 1 });

    emitSupportConversationRefresh({
      conversationId,
      userId: conversation.user?._id || conversation.user,
    });

    return res.status(200).json({
      success: true,
      conversation: mapConversation(refreshedConversation),
      messages: messages.map(mapMessage),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load conversation details",
    });
  }
};

export const sendVendorSupportReply = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const text = String(req.body?.text || "").trim();
    const attachments = await uploadAttachments(req.files || []);

    if (!text && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reply or image attachment",
      });
    }

    const conversation = await SupportConversation.findById(conversationId)
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const admin = await Admin.findById(req.id).select("_id");
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not authenticated",
      });
    }

    const message = await SupportMessage.create({
      conversation: conversationId,
      senderId: req.id,
      senderRole: "admin",
      text,
      attachments,
      status: "sent",
    });

    await SupportConversation.findByIdAndUpdate(conversationId, {
      $set: {
        assignedAdmin: req.id,
        lastMessage: text || "Image attachment",
        lastMessageAt: message.createdAt,
        lastMessageSenderRole: "admin",
      },
      $inc: {
        unreadForUser: 1,
      },
    });

    const updatedConversation = await SupportConversation.findById(
      conversationId,
    )
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    const payload = mapMessage(message.toObject ? message.toObject() : message);

    emitSupportMessageCreated({
      conversationId,
      userId: conversation.user?._id || conversation.user,
      message: payload,
    });
    emitSupportConversationRefresh({
      conversationId,
      userId: conversation.user?._id || conversation.user,
    });

    return res.status(201).json({
      success: true,
      conversation: mapConversation(updatedConversation),
      message: payload,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send admin reply",
    });
  }
};

export const ensureAdminUserSupportConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let conversation = await SupportConversation.findOne({ user: userId })
      .sort({ updatedAt: -1 })
      .populate("user", "name email phone photoUrl")
      .populate("assignedVendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl");

    if (!conversation) {
      conversation = await createConversationForUser(userId);
    }

    if (!conversation.assignedAdmin) {
      conversation = await SupportConversation.findByIdAndUpdate(
        conversation._id,
        {
          $set: { assignedAdmin: req.id },
        },
        { new: true }
      )
        .populate("user", "name email phone photoUrl")
        .populate("assignedVendor", "name email photoUrl")
        .populate("assignedAdmin", "name email photoUrl");
    }

    return res.status(200).json({
      success: true,
      conversation: mapConversation(conversation),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to prepare support conversation",
    });
  }
};

export const deleteVendorSupportConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await loadConversationWithRelations(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const userId = conversation.user?._id || conversation.user;
    await deleteConversationAssets(conversationId);
    emitSupportConversationRefresh({
      conversationId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete support conversation",
    });
  }
};
