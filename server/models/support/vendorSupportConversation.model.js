import mongoose from "mongoose";

const vendorSupportConversationSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true,
      index: true,
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessageSenderRole: {
      type: String,
      enum: ["vendor", "admin", ""],
      default: "",
    },
    unreadForVendor: {
      type: Number,
      default: 0,
    },
    unreadForAdmin: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

export const VendorSupportConversation = mongoose.model(
  "VendorSupportConversation",
  vendorSupportConversationSchema
);
