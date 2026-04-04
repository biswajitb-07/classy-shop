import mongoose from "mongoose";
import { Vendor } from "../../models/vendor/vendor.model.js";
import { Admin } from "../../models/admin/admin.model.js";
import { VendorSupportConversation } from "../../models/support/vendorSupportConversation.model.js";
import { VendorSupportMessage } from "../../models/support/vendorSupportMessage.model.js";
import {
  emitVendorSupportConversationRefresh,
  emitVendorSupportMessageCreated,
} from "../../socket/socket.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../../utils/cloudinary.js";
import { classifySupportTicket } from "../../services/ai/commerceAssistant.service.js";

const mapConversation = (conversation) => ({
  _id: conversation._id,
  vendor: conversation.vendor,
  assignedAdmin: conversation.assignedAdmin,
  lastMessage: conversation.lastMessage,
  lastMessageAt: conversation.lastMessageAt,
  lastMessageSenderRole: conversation.lastMessageSenderRole,
  unreadForVendor: conversation.unreadForVendor,
  unreadForAdmin: conversation.unreadForAdmin,
  status: conversation.status,
  classification: classifySupportTicket({
    message: conversation.lastMessage,
    scope: "vendor",
  }),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

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

const loadConversation = (conversationId) =>
  VendorSupportConversation.findById(conversationId)
    .populate("vendor", "name email photoUrl")
    .populate("assignedAdmin", "name email photoUrl");

const uploadAttachments = async (files = []) => {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const result = await uploadMedia(file);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.originalname || "",
      };
    })
  );

  return uploads;
};

const deleteConversationAssets = async (conversationId) => {
  const messages = await VendorSupportMessage.find({
    conversation: conversationId,
  }).select("attachments");

  const publicIds = messages.flatMap((message) =>
    (message.attachments || [])
      .map((attachment) => attachment.publicId)
      .filter(Boolean)
  );

  await Promise.all(publicIds.map((publicId) => deleteMediaFromCloudinary(publicId)));
  await VendorSupportMessage.deleteMany({ conversation: conversationId });
  await VendorSupportConversation.findByIdAndDelete(conversationId);
};

const cleanupExpiredVendorSupportConversations = async (filter = {}) => {
  const cutoffDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const expiredConversations = await VendorSupportConversation.find({
    ...filter,
    lastMessageAt: { $ne: null, $lte: cutoffDate },
  }).select("_id");

  if (!expiredConversations.length) return;

  await Promise.all(
    expiredConversations.map((conversation) =>
      deleteConversationAssets(conversation._id),
    )
  );
};

const ensureVendorConversation = async (vendorId) => {
  await cleanupExpiredVendorSupportConversations({ vendor: vendorId });

  const existing = await VendorSupportConversation.findOne({ vendor: vendorId })
    .populate("vendor", "name email photoUrl")
    .populate("assignedAdmin", "name email photoUrl");
  if (existing) return existing;

  const created = await VendorSupportConversation.create({
    vendor: vendorId,
  });
  return loadConversation(created._id);
};

export const getVendorAdminConversations = async (req, res) => {
  try {
    if (req.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access admin support",
      });
    }

    const conversation = await ensureVendorConversation(req.id);
    const conversations = [mapConversation(conversation)];

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load admin support conversations",
    });
  }
};

export const ensureAdminVendorSupportConversation = async (req, res) => {
  try {
    const { vendorId } = req.params;

    await cleanupExpiredVendorSupportConversations({ vendor: vendorId });

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor id",
      });
    }

    const vendor = await Vendor.findById(vendorId).select("_id");
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    let conversation = await ensureVendorConversation(vendorId);

    if (!conversation.assignedAdmin) {
      conversation = await VendorSupportConversation.findByIdAndUpdate(
        conversation._id,
        {
          $set: { assignedAdmin: req.id },
        },
        { new: true }
      )
        .populate("vendor", "name email photoUrl")
        .populate("assignedAdmin", "name email photoUrl");
    }

    return res.status(200).json({
      success: true,
      conversation: mapConversation(conversation),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to prepare vendor support conversation",
    });
  }
};

export const getVendorAdminConversationDetails = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (req.role === "vendor") {
      await cleanupExpiredVendorSupportConversations({ vendor: req.id });
    } else if (req.role === "admin") {
      await cleanupExpiredVendorSupportConversations();
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id",
      });
    }

    const conversation = await loadConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (req.role === "vendor" && String(conversation.vendor?._id || conversation.vendor) !== String(req.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this conversation",
      });
    }

    if (req.role !== "vendor" && req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await VendorSupportMessage.updateMany(
      {
        conversation: conversationId,
        senderRole: req.role === "admin" ? "vendor" : "admin",
        status: { $in: ["sent", "delivered"] },
      },
      {
        $set: {
          status: "read",
          readAt: new Date(),
        },
      }
    );

    await VendorSupportConversation.findByIdAndUpdate(conversationId, {
      $set: req.role === "admin" ? { unreadForAdmin: 0 } : { unreadForVendor: 0 },
    });

    const refreshedConversation = await loadConversation(conversationId);
    const messages = await VendorSupportMessage.find({
      conversation: conversationId,
    }).sort({ createdAt: 1 });

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

export const sendVendorAdminMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const text = String(req.body?.text || "").trim();
    const attachments = await uploadAttachments(req.files || []);

    if (!text && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a message or image attachment",
      });
    }

    const conversation = await loadConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (req.role === "vendor" && String(conversation.vendor?._id || conversation.vendor) !== String(req.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot use this conversation",
      });
    }

    if (req.role !== "vendor" && req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const senderRole = req.role === "admin" ? "admin" : "vendor";
    const receiverUnreadField = req.role === "admin" ? "unreadForVendor" : "unreadForAdmin";

    if (req.role === "admin") {
      const admin = await Admin.findById(req.id).select("_id");
      if (!admin) {
        return res.status(403).json({
          success: false,
          message: "Admin access only",
        });
      }
    }

    const message = await VendorSupportMessage.create({
      conversation: conversationId,
      senderId: req.id,
      senderRole,
      text,
      attachments,
      status: "sent",
    });

    await VendorSupportConversation.findByIdAndUpdate(conversationId, {
      $set: {
        ...(req.role === "admin" ? { assignedAdmin: req.id } : {}),
        lastMessage: text || "Image attachment",
        lastMessageAt: message.createdAt,
        lastMessageSenderRole: senderRole,
      },
      $inc: {
        [receiverUnreadField]: 1,
      },
    });

    const updatedConversation = await loadConversation(conversationId);
    const payload = mapMessage(message.toObject ? message.toObject() : message);

    emitVendorSupportMessageCreated({
      conversationId,
      vendorId: conversation.vendor?._id || conversation.vendor,
      message: payload,
    });
    emitVendorSupportConversationRefresh({
      conversationId,
      vendorId: conversation.vendor?._id || conversation.vendor,
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

export const getAdminVendorSupportConversations = async (_req, res) => {
  try {
    await cleanupExpiredVendorSupportConversations();

    const conversations = await VendorSupportConversation.find({
      lastMessageAt: { $ne: null },
    })
      .populate("vendor", "name email photoUrl")
      .populate("assignedAdmin", "name email photoUrl")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    await VendorSupportMessage.updateMany(
      {
        conversation: { $in: conversations.map((conversation) => conversation._id) },
        senderRole: "vendor",
        status: "sent",
      },
      { $set: { status: "delivered" } }
    );

    return res.status(200).json({
      success: true,
      conversations: conversations.map(mapConversation),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load vendor support chats",
    });
  }
};

export const deleteVendorAdminConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await loadConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (req.role === "vendor" && String(conversation.vendor?._id || conversation.vendor) !== String(req.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this conversation",
      });
    }

    if (req.role !== "vendor" && req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await deleteConversationAssets(conversationId);

    emitVendorSupportConversationRefresh({
      conversationId,
      vendorId: conversation.vendor?._id || conversation.vendor,
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
