import mongoose from "mongoose";

const supportConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
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
      enum: ["user", "vendor", ""],
      default: "",
    },
    unreadForUser: {
      type: Number,
      default: 0,
    },
    unreadForVendor: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
  },
  { timestamps: true },
);

export const SupportConversation = mongoose.model(
  "SupportConversation",
  supportConversationSchema,
);
