import mongoose from "mongoose";

const vendorSupportAttachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const vendorSupportMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorSupportConversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["vendor", "admin"],
      required: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [vendorSupportAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const VendorSupportMessage = mongoose.model(
  "VendorSupportMessage",
  vendorSupportMessageSchema
);
